/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Dapp, AppState, EventProvider } from '@uniqys/dapp-interface'
import { Transaction as CoreTransaction, BlockHeader, TransactionType, MerkleTree } from '@uniqys/blockchain'
import { Transaction, SignedTransaction } from '@uniqys/easy-types'
import { deserialize } from '@uniqys/serialize'
import { Optional } from '@uniqys/types'
import { State } from './state'
import { EasyMemcached, OperationMode } from './memcached-implementation'
import { SignedRequest, EventRequest, Response } from './packer'
import { URL } from 'url'
import debug from 'debug'
const logger = debug('easy-fw:controller')

export class Controller implements Dapp {
  constructor (
    private readonly app: URL,
    private readonly state: State,
    private readonly memcachedImpl: EasyMemcached,
    private readonly eventProvider?: EventProvider
  ) { }

  public async connect (): Promise<AppState> {
    await this.state.ready()
    const root = this.state.getAppStateHash()
    const height = await this.state.getHeight()
    return new AppState(height, root, MerkleTree.root([]))
  }

  public async validateTransaction (coreTx: CoreTransaction): Promise<boolean> {
    try {
      const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
      const account = await this.state.getAccount(tx.signer)
      if (tx.nonce <= account.nonce) throw new Error(`transaction nonce is too low: current ${account.nonce}, got ${tx.nonce}`)
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
    const eventNonce = await this.state.getEventNonce()
    if (this.eventProvider) {
      selected.push(...await this.eventProvider.getTransactions(latestEventTimestamp, latestBlockTimestamp, eventNonce))
    }

    if (selected.length > 0) {
      // Transactions to include existed
      return Optional.some(selected)
    }

    // Check for pending new event transactions
    const currentTimestamp = Math.floor(new Date().getTime() / 1000)
    const newEventTxs = this.eventProvider ?
      await this.eventProvider.getTransactions(latestEventTimestamp, currentTimestamp, eventNonce) : []
    if (this.eventProvider && newEventTxs.length > 0) {
      // Pending event transaction existed
      // Propose empty block
      return Optional.some([])
    }

    return Optional.none()
  }

  public async executeTransactions (coreTxs: CoreTransaction[], header: BlockHeader): Promise<AppState> {
    for (const coreTx of coreTxs) {
      switch (coreTx.type) {
        case TransactionType.Normal: {
          const tx = deserialize(coreTx.data, SignedTransaction.deserialize)
          const sender = tx.signer
          await this.state.rwLock.writeLock.use(async () => {
            const root = this.state.top.root
            try {
              const next = (await this.state.getAccount(sender)).incrementNonce()
              // skip non continuous nonce transaction
              if (tx.nonce !== next.nonce) { throw new Error('non continuous nonce') }
              await this.state.setAccount(sender, next)
              this.memcachedImpl.changeMode(OperationMode.ReadWrite)
              const res = await Response.pack(await SignedRequest.unpack(tx, header, this.app))
              await this.state.result.set(coreTx.hash, res)
              if (400 <= res.status && res.status < 600) { throw new Error(res.message) }
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
          const tx = deserialize(coreTx.data, Transaction.deserialize)
          await this.state.rwLock.writeLock.use(async () => {
            const root = this.state.top.root
            try {
              const nextNonce = await this.state.getEventNonce() + 1
              if (tx.nonce !== nextNonce) { throw new Error('non continuous nonce') }
              await this.state.incrementEventNonce()
              this.memcachedImpl.changeMode(OperationMode.ReadWrite)
              const res = await Response.pack(await EventRequest.unpack(tx, header, this.app))
              await this.state.event.set(coreTx.hash, res)
              if (400 <= res.status && res.status < 600) { throw new Error(res.message) }
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
    await this.state.meta.incrementHeight()
    await this.state.meta.setLatestBlockTimestamp(header.timestamp)

    const eventTxs = coreTxs.filter(tx => tx.type === TransactionType.Event)
    if (eventTxs.length > 0) { await this.state.meta.setLatestEventTimestamp(header.timestamp) }
    const latestEventTimestamp = await this.state.meta.getLatestEventTimestamp()
    const eventNonce = await this.state.getEventNonce()
    const newEventTxs = this.eventProvider ? await this.eventProvider.getTransactions(latestEventTimestamp, header.timestamp, eventNonce) : []
    const eventTransactionRoot = MerkleTree.root(newEventTxs)

    const root = this.state.getAppStateHash()
    const height = await this.state.getHeight()
    return new AppState(height, root, eventTransactionRoot)
  }
}
