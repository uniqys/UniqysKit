/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Transaction } from '@uniqys/blockchain'
import { Hash } from '@uniqys/signature'
import { Message } from '@uniqys/protocol'
import { RemoteNodeSet } from './remote-node'
import debug from 'debug'
const logger = debug('chain-core:tx-pool')

export interface TransactionPoolOptions {
  maxPooledTransactions: number // count
  propagateRateExponent: number // count ^ R
}
export namespace TransactionPoolOptions {
  export const defaults: TransactionPoolOptions = {
    maxPooledTransactions: 1000,
    propagateRateExponent: 1
  }
}

export class TransactionPool {
  private readonly options: TransactionPoolOptions
  private pool = new Map<string, Transaction>()
  constructor (
    private readonly remoteNode: RemoteNodeSet,
    private readonly validator: (tx: Transaction) => Promise<boolean>,
    private readonly selector: (txs: Transaction[]) => Promise<Transaction[]>,
    options?: Partial<TransactionPoolOptions>
  ) {
    this.options = Object.assign({}, TransactionPoolOptions.defaults, options)
  }

  public has (hash: Hash) {
    return this.pool.has(hash.toHexString())
  }

  public async add (tx: Transaction): Promise<void> {
    const key = tx.hash.toHexString()
    if (!this.canAdd(key)) return

    if (await this.validator(tx)) {
      if (!this.canAdd(key)) return // re-check
      this.pool.set(key, tx)
      await this.propagateTransaction(tx)
    }
  }

  public async update (executed: Transaction[]): Promise<void> {
    // remove executed txs
    executed.forEach(tx => this.pool.delete(tx.hash.toHexString()))

    const pooled = Array.from(this.pool.values())
    await Promise.all(pooled.map(
      tx => this.validator(tx)
        .then(ok => {
          if (!ok) { this.pool.delete(tx.hash.toHexString()) }
        })
    ))
  }

  public selectTransactions (): Promise<Transaction[]> {
    return this.pool.size === 0 ? Promise.resolve([]) : this.selector(Array.from(this.pool.values()))
  }

  private async propagateTransaction (tx: Transaction): Promise<void> {
    logger('propagate transaction %s', tx.hash.toHexString())
    const newTransactionMsg = new Message.NewTransaction(tx)
    await Promise.all(this.remoteNode.pickTransactionReceivers(this.options.propagateRateExponent)
      .map(node => node.protocol.sendNewTransaction(newTransactionMsg)))
  }

  private canAdd (key: string): boolean {
    if (this.pool.has(key)) return false
    if (this.pool.size >= this.options.maxPooledTransactions) {
      logger('transaction pool is full')
      return false
    }
    return true
  }
}
