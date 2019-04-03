/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Dapp, AppState, EventProvider } from '@uniqys/dapp-interface'
import { Transaction as CoreTransaction, BlockHeader, TransactionType, MerkleTree } from '@uniqys/blockchain'
import { EventTransaction, SignedTransaction } from '@uniqys/easy-types'
import { serialize, deserialize } from '@uniqys/serialize'
import { Hash } from '@uniqys/signature'
import { Optional } from '@uniqys/types'
import { State, TransactionResult } from './state'
import { EasyMemcached, OperationMode } from './memcached-implementation'
import { SignedRequest, EventRequest, Response } from './packer'
import { URL } from 'url'
import debug from 'debug'
const logger = debug('easy-fw:controller')

export interface ControllerOptions {
  transactionSizeLimit: number
}
export namespace ControllerOptions {
  export const defaults: ControllerOptions = {
    transactionSizeLimit: 8 * 1024 * 1024 // 8MB
  }
}

export class Controller implements Dapp {
  private readonly options: ControllerOptions

  constructor (
    private readonly app: URL,
    private readonly state: State,
    private readonly memcachedImpl: EasyMemcached,
    private readonly eventProvider?: EventProvider,
    options?: Partial<ControllerOptions>
  ) {
    this.options = Object.assign({}, ControllerOptions.defaults, options)
  }

  public async connect (): Promise<AppState> {
    await this.state.ready()
    if (this.eventProvider) { await this.eventProvider.ready() }
    return this.state.getAppState()
  }

  public async validateTransaction (coreTx: CoreTransaction): Promise<boolean> {
    try {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const account = await this.state.getAccount(tx.signer)
      if (tx.nonce <= account.nonce) throw new Error(`transaction nonce is too low: current ${account.nonce}, got ${tx.nonce}`)
      const transactionSize = serialize(coreTx).byteLength
      if (transactionSize > this.options.transactionSizeLimit) throw new Error(`transaction size exceeds the limit: limit ${this.options.transactionSizeLimit} bytes, got ${transactionSize} bytes`)
      return true
    } catch (err) {
      logger('validate transaction failed: %s', err.message)
      return false
    }
  }

  public async selectTransactions (coreTxs: CoreTransaction[]): Promise<Optional<CoreTransaction[]>> {
    const selected: CoreTransaction[] = []
    for (const coreTx of coreTxs) {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const account = await this.state.getAccount(tx.signer)
      if (tx.nonce === account.nonce + 1) {
        selected.push(coreTx)
      }
    }

    // Check for event transactions to include in next block
    const latestBlockTimestamp = await this.state.meta.getLatestBlockTimestamp()
    const latestEventTimestamp = await this.state.meta.getLatestEventTimestamp()
    const nextEventNonce = await this.state.meta.getEventNonce() + 1
    const nextValidatorSet = await this.state.meta.getNextValidatorSet()
    if (this.eventProvider && latestEventTimestamp < latestBlockTimestamp) {
      selected.push(...await this.eventProvider.getTransactions(latestEventTimestamp, latestBlockTimestamp, nextEventNonce, nextValidatorSet))
    }

    if (selected.length > 0) {
      // Transactions to include existed
      return Optional.some(selected)
    }

    // Check for pending new event transactions
    const currentTimestamp = Math.floor(new Date().getTime() / 1000)
    const newEventTxs = this.eventProvider && (latestEventTimestamp < currentTimestamp)
      ? await this.eventProvider.getTransactions(latestEventTimestamp, currentTimestamp, nextEventNonce, nextValidatorSet)
      : []
    if (this.eventProvider && newEventTxs.length > 0) {
      // Pending event transaction existed
      // Propose empty block
      return Optional.some([])
    }

    return Optional.none()
  }

  public async executeTransactions (coreTxs: CoreTransaction[], header: BlockHeader): Promise<AppState> {
    let eventExists: boolean = false
    const validTxHashes: Hash[] = []

    for (const coreTx of coreTxs) {
      switch (coreTx.type) {
        case TransactionType.Normal: {
          const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
          const sender = tx.signer
          await this.state.rwLock.writeLock.use(async () => {
            const root = this.state.top.root
            try {
              const next = (await this.state.getAccount(sender)).incrementNonce()
              if (tx.nonce !== next.nonce) { throw new Error('non continuous nonce') }
              await this.state.setAccount(sender, next)
              this.memcachedImpl.changeMode(OperationMode.ReadWrite)
              const res = await Response.pack(await SignedRequest.unpack(tx, header, coreTx.hash, this.app))
              await this.state.result.set(coreTx.hash, new TransactionResult(header.height, res))
              if (400 <= res.status && res.status < 600) { throw new Error(res.message) }
              validTxHashes.push(coreTx.hash)
            } catch (err) {
              logger('error in action: %s', err.message)
              await this.state.top.rollback(root)
            } finally {
              this.memcachedImpl.changeMode(OperationMode.ReadOnly)
            }
          })
          break
        }
        case TransactionType.Event: {
          eventExists = true
          const tx = deserialize(coreTx.data, EventTransaction.deserialize)
          await this.state.rwLock.writeLock.use(async () => {
            const root = this.state.top.root
            try {
              const nextNonce = await this.state.meta.getEventNonce() + 1
              if (tx.nonce !== nextNonce) { throw new Error('non continuous nonce') }
              await this.state.meta.incrementEventNonce()
              this.memcachedImpl.changeMode(OperationMode.ReadWrite)
              const res = await Response.pack(await EventRequest.unpack(tx, header, coreTx.hash, this.app))
              if (400 <= res.status && res.status < 600) { throw new Error(res.message) }
              if (tx.validatorSet.validators.length > 0) { await this.state.meta.setNextValidatorSet(tx.validatorSet) }
              validTxHashes.push(coreTx.hash)
            } catch (err) {
              logger('error in action: %s', err.message)
              await this.state.top.rollback(root)
            } finally {
              this.memcachedImpl.changeMode(OperationMode.ReadOnly)
            }
          })
          break
        }
        default: throw new Error()
      }
    }

    // update state info
    await this.state.rwLock.writeLock.use(async () => {
      // fetch next event transaction root
      const latestEventTimestamp = await this.state.meta.getLatestEventTimestamp()
      const eventNonce = await this.state.meta.getEventNonce() + 1
      const nextValidatorSet = await this.state.meta.getNextValidatorSet()
      const eventTxs = this.eventProvider
        ? await this.eventProvider.getTransactions(latestEventTimestamp, header.timestamp, eventNonce, nextValidatorSet)
        : []
      const eventTxRoot = MerkleTree.root(eventTxs)

      await this.state.newHeight(header.timestamp, validTxHashes, eventExists, eventTxRoot)
    })

    return this.state.getAppState()
  }
}
