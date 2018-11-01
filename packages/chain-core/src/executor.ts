/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Blockchain, Transaction } from '@uniqys/blockchain'
import { AsyncLoop } from '@uniqys/async-loop'
import * as dapi from '@uniqys/dapp-interface'
import { EventEmitter } from 'events'
import debug from 'debug'
const logger = debug('chain-core:executor')

export class Executor {
  public get lastAppState (): dapi.AppState {
    if (!this._lastAppState) { throw new Error('not initialized') }
    return this._lastAppState
  }
  private _lastAppState?: dapi.AppState
  private readonly executionLoop = new AsyncLoop(async () => { await this.executeBlockTransactions() })
  private readonly event = new EventEmitter()
  constructor (
    private readonly blockchain: Blockchain,
    private readonly dapp: dapi.Dapp
  ) {
    this.executionLoop.on('error', err => this.event.emit('error', err))
  }

  public async initialize () {
    const [height, appState] = await Promise.all([
      this.blockchain.height,
      this.dapp.connect() // connect dapp
    ])

    this._lastAppState = appState
    if (this.lastAppState.height > height) throw new Error('need reset app')
    // already know app state hash
    if (this.lastAppState.height < height) {
      const expect = (await this.blockchain.headerOf(this.lastAppState.height + 1)).appStateHash
      if (!this.lastAppState.hash.equals(expect)) throw new Error('app hash mismatch')
    }
    logger(`initialized at block(${this.lastAppState.height})`)
  }

  public start () {
    this.executionLoop.start()
  }

  public stop () {
    this.executionLoop.stop()
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }
  public onExecuted (listener: (appState: dapi.AppState, txs: Transaction[]) => void) { this.event.on('executed', listener) }

  public get completed () {
    return (async () => await this.blockchain.height === this.lastAppState.height)()
  }

  private async executeBlockTransactions () {
    if ((await this.blockchain.height) !== this.lastAppState.height) {
      const height = this.lastAppState.height + 1
      const knownHeight = await this.blockchain.height
      logger(`execute transaction in block(${height})`)
      const block = await this.blockchain.blockOf(height)
      const txs = block.body.transactionList.transactions
      const header = block.header
      const appState = await this.dapp.executeTransactions(txs, header)
      if (appState.height !== height) throw new Error('block height mismatch')
      if (appState.height < knownHeight) {
        const expect = (await this.blockchain.headerOf(appState.height + 1)).appStateHash
        if (!appState.hash.equals(expect)) throw new Error('app hash mismatch')
      }
      this._lastAppState = appState
      this.event.emit('executed', appState, txs)
    }
  }
}
