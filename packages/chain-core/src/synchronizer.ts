/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Blockchain, Block, BlockHeader, Consensus, ValidatorSet } from '@uniqys/blockchain'
import { AsyncLoop } from '@uniqys/async-loop'
import { Message } from '@uniqys/protocol'
import { PriorityQueue, Utility } from '@uniqys/priority-queue'
import { Mutex } from '@uniqys/lock'
import { RemoteNode, RemoteNodeSet } from './remote-node'
import { EventEmitter } from 'events'
import debug from 'debug'
const logger = debug('chain-core:sync')

export interface SynchronizerOptions {
  waitForFetch: number // ms
  catchUpInterval: number // ms
  dynamicValidatorSet: boolean
  trustConsensusPeriod: number // s
  maxFetchHeaders: number // count
  maxFetchBodies: number // count
  maxPendingGap: number // height
  propagateRateExponent: number // count ^ R
  // TODO: DoS protection
  // pendingBlocksLimit: number
  // fetchSchedulesLimit: number
}
export namespace SynchronizerOptions {
  export const defaults: SynchronizerOptions = {
    waitForFetch: 500,
    catchUpInterval: 1000,
    // static validator set
    dynamicValidatorSet: false,
    trustConsensusPeriod: 0,
    // dynamic validator set
    // dynamicValidatorSet: true,
    // trustConsensusPeriod: 86400, // 1day: according to stake withdraw wait,
    maxFetchHeaders: 1000,
    maxFetchBodies: 100,
    maxPendingGap: 50,
    propagateRateExponent: 0.5
  }
}

export class Synchronizer {
  private readonly options: SynchronizerOptions
  private readonly blockQueue = new PriorityQueue(Utility.ascending<{block: Block, consensus: Consensus, from?: RemoteNode}>())
  private readonly fetchSchedule = new Map<number, NodeJS.Timer>()
  private readonly chainingLoop = new AsyncLoop(() => this.chainPendingBlock())
  private readonly catchUpMutex = new Mutex()
  private readonly event = new EventEmitter()
  private catchUpTimer?: NodeJS.Timer
  constructor (
    private readonly blockchain: Blockchain,
    private readonly remoteNode: RemoteNodeSet,
    private readonly dropRemoteNode: (node: RemoteNode) => void,
    options?: Partial<SynchronizerOptions>
  ) {
    this.options = Object.assign({}, SynchronizerOptions.defaults, options)
    this.chainingLoop.on('error', err => this.event.emit('error', err))
  }

  public start () {
    this.chainingLoop.start()
    this.resetCatchUpTimer()
  }

  public stop () {
    this.chainingLoop.stop()
    this.clearCatchUpTimer()
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }

  public newBlockHeight (message: Message.NewBlockHeight, from: RemoteNode) {
    if (from.height < message.height) {
      from.height = message.height
      this.scheduleFetch(message.height).catch(err => this.event.emit('error', err))
    }
  }

  public newBlock (message: Message.NewBlock, from: RemoteNode) {
    if (from.height < message.block.header.height) {
      from.height = message.block.header.height
    }
    this.enqueueNewBlock(message.block, message.consensus, from).catch(err => this.event.emit('error', err))
  }

  public newBlockFromLocal (block: Block, consensus: Consensus) {
    this.enqueueNewBlock(block, consensus).catch(err => this.event.emit('error', err))
  }

  public newNode () {
    this.catchUp()
  }

  private async scheduleFetch (height: number) {
    // already scheduled or known height
    if (this.fetchSchedule.get(height) || height <= (await this.blockchain.height)) { return }

    this.fetchSchedule.set(height, setTimeout(() => {
      this.fetch(height).catch(err => { this.event.emit('error', err) })
    }, this.options.waitForFetch))
  }

  private async enqueueNewBlock (block: Block, consensus: Consensus, from?: RemoteNode) {
    const knownHeight = await this.blockchain.height
    const height = block.header.height
    if (height <= knownHeight || (height - knownHeight) > this.options.maxPendingGap) { return }
    this.enqueueBlock(block, consensus, from)
  }

  private enqueueBlock (block: Block, consensus: Consensus, from?: RemoteNode) {
    this.blockQueue.enqueue({ priority: block.header.height, value: { block, consensus, from } })
  }

  private async fetch (height: number): Promise<void > {
    const knownHeight = await this.blockchain.height
    if (height <= knownHeight || (height - knownHeight) > this.options.maxPendingGap) { return }
    let _provider = this.remoteNode.pickIdleProvider(height)
    while (_provider) {
      const leader = _provider
      try {
        await leader.use(async () => {
          const consented = await leader.protocol.fetchConsentedHeader(new Message.GetConsentedHeader(height))
          const body = (await leader.protocol.fetchBodies(new Message.GetBodies(height, 1))).bodies[0]
          this.enqueueBlock(new Block(consented.header, body), consented.consensus, leader)
        })
        return
      } catch (err) {
        logger('fetch invalid from: %d', leader.peerId)
        this.dropRemoteNode(leader)
      }
      _provider = this.remoteNode.pickIdleProvider(height) // next node
    }
  }

  // catch up, if no progress in the time
  private resetCatchUpTimer (): void {
    this.clearCatchUpTimer()
    this.catchUpTimer = setTimeout(() => { this.catchUp() }, this.options.catchUpInterval)
  }

  private clearCatchUpTimer (): void {
    if (this.catchUpTimer) clearTimeout(this.catchUpTimer)
  }

  // catch up with best node
  private catchUp (): void {
    // only one process at same time
    if (!this.catchUpMutex.locked) {
      this.catchUpMutex.use(() => this.catchUpAsync())
        .catch(err => this.event.emit('error', err))
    }
    this.resetCatchUpTimer()
  }

  private async catchUpAsync (): Promise<void> {
    const best = this.remoteNode.bestNode()
    if (!best) { return }
    const known = await this.blockchain.height
    if (best.height <= known) { return }
    try {
      // fetch headers to best.height
      const consented = await this.fetchLastConsentedHeader(best)
      await this.catchUpHeaders(best, consented.header)
      // fetch bodies in parallel
      await this.catchUpBodies(consented.header.height)
      // update height and last consensus
      await this.blockchain.blockStore.rwLock.writeLock.use(() =>
        this.updateHeight(consented.header.height, consented.consensus))
      logger('catch up with %s to height %d', best.peerId, consented.header.height)
    } catch (err) {
      logger('catch up failed: %s', err.message)
    }
  }

  private async fetchLastConsentedHeader (best: RemoteNode): Promise<Message.ConsentedHeader> {
    // if (this.options.dynamicValidatorSet) {
    //  this.catchUpValidatorSet(best)
    // }
    return best.use(async () => {
      const consented = await best.protocol.fetchConsentedHeader(new Message.GetConsentedHeader(best.height))
      try {
        consented.consensus.validate(consented.header.hash, this.blockchain.genesisBlock.hash, await this.trustedValidatorSet())
      } catch (err) {
        this.dropRemoteNode(best)
        throw err
      }
      return consented
    })
  }

  private async catchUpHeaders (provider: RemoteNode, last: BlockHeader) {
    await this.blockchain.blockStore.setHeader(last.height, last)
    await provider.use(async () => {
      // fetch headers backward
      while (true) {
        // TODO: best node may disconnect
        const unknown = (await this.blockchain.height) + 1
        if (last.height <= unknown) { break }
        const from = Math.max(last.height - this.options.maxFetchHeaders, unknown)
        const count = last.height - from
        const msg = await provider.protocol.fetchHeaders(new Message.GetHeaders(from, count))
        const headers = msg.headers.reverse() // backward
        for (const header of headers) {
          if (header.height + 1 !== last.height || !header.hash.equals(last.lastBlockHash)) {
            this.dropRemoteNode(provider)
            throw new Error('fetched header is invalid')
          }
          await this.blockchain.blockStore.setHeader(header.height, header)
          last = header
        }
      }
    })
    logger('catch up headers complete')
  }

  private async catchUpBodies (target: number) {
    // split to jobs
    const jobQueue = new PriorityQueue<{from: number, to: number}>((job1, job2) => job2.to - job1.to)
    const known = await this.blockchain.height
    for (let to = target; known < to; to -= this.options.maxFetchBodies) {
      const from = Math.max(to - this.options.maxFetchBodies, known + 1)
      jobQueue.enqueue({ from, to })
    }
    // process jobs
    let inProgress = 0
    await new Promise((resolve, reject) => {
      const fetchLoop: AsyncLoop = new AsyncLoop(async () => {
        const job = jobQueue.dequeue()
        if (!job && inProgress === 0) {
          fetchLoop.stop()
          return
        }
        if (!job) { return } // wait for job in progress
        const provider = this.remoteNode.pickIdleProvider(job.to)
        if (!provider) {
          return jobQueue.enqueue(job) // wait for idle node
        }
        inProgress++
        // parallel
        provider.use(async () => {
          const from = job.from
          const count = job.to - job.from + 1
          const msg = await provider.protocol.fetchBodies(new Message.GetBodies(from, count))
          for (let i = 0; i < count; i++) {
            const header = await this.blockchain.blockStore.getHeader(from + i)
            const body = msg.bodies[i]
            try {
              body.validate(header)
            } catch (err) {
              logger('fetched body is invalid: %s', err.message)
              this.dropRemoteNode(provider)
              throw err
            }
            await this.blockchain.blockStore.setBody(from + i, body)
          }
        })
          .finally(() => { inProgress-- })
          .catch(err => {
            logger('retry fetch body from %d to %d. reason: %s', job.from, job.to, err.message)
            jobQueue.enqueue(job)
          })
      })
      fetchLoop.on('error', reject)
      fetchLoop.on('end', resolve)
      fetchLoop.start()
    })
    logger('catch up bodies complete')
  }

  private async updateHeight (height: number, consensus: Consensus) {
    const known = await this.blockchain.height
    if (height > known) {
      await this.blockchain.blockStore.setHeight(height)
      await this.blockchain.blockStore.setLastConsensus(consensus)
    }
  }

  private async chainPendingBlock (): Promise<void> {
    const pendingOrUndef = this.blockQueue.dequeue()
    if (pendingOrUndef) {
      const pending = pendingOrUndef.value
      try {
        const knownHeight = await this.blockchain.height
        const height = pending.block.header.height
        // already known block height is simply skipped
        if (height > knownHeight) {
          if (height === knownHeight + 1) {
            pending.block.validate()
            pending.consensus.validate(pending.block.hash, this.blockchain.genesisBlock.hash, await this.trustedValidatorSet())
            // take lock and recheck height
            await this.blockchain.blockStore.rwLock.writeLock.use(async () => {
              const knownHeight = await this.blockchain.height
              // istanbul ignore else: OK. The block has been added concurrently by another logic.
              if (height === knownHeight + 1) {
                await Promise.all([
                  this.blockchain.blockStore.setHeader(height, pending.block.header),
                  this.blockchain.blockStore.setBody(height, pending.block.body)
                ])
                await this.updateHeight(height, pending.consensus)
              }
            })
            if (pending.from) {
              logger('chain block(%d) from remote: %s', pending.block.header.height, pending.from.peerId)
            } else {
              logger('chain block(%d) from local', pending.block.header.height)
            }
            this.resetCatchUpTimer()
            await this.propagateBlock(pending.block, pending.consensus)
          } else {
            // re-enqueue
            this.enqueueBlock(pending.block, pending.consensus, pending.from)
          }
        }
      // TODO: catch peer caused exception only
      } catch (err) {
        if (pending.from) {
          logger('failed to chain the pending block from remote: %s', err.message)
          this.dropRemoteNode(pending.from)
        } else {
          logger('failed to chain the pending block from local: %s', err.message)
          throw new Error('failed to chain from local')
        }
      }
    }
  }

  private async propagateBlock (block: Block, consensus: Consensus): Promise<void> {
    const height = block.header.height
    logger('propagate block (%d)', height)
    const newBlockMsg = new Message.NewBlock(block, consensus)
    const newBlockHeightMsg = new Message.NewBlockHeight(height)
    await Promise.all(this.remoteNode.pickBlockReceivers(height, this.options.propagateRateExponent)
      .map(node => node.protocol.sendNewBlock(newBlockMsg)))
    await Promise.all(this.remoteNode.pickBlockReceivers(height)
      .map(node => node.protocol.sendNewBlockHeight(newBlockHeightMsg)))
  }

  private async trustedValidatorSet (): Promise<ValidatorSet> {
    if (this.options.dynamicValidatorSet) {
      throw new Error('not implemented')
    } else {
      // static
      return this.blockchain.initialValidatorSet
    }
  }
}
