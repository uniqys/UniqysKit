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
  public onExecuted (listener: (height: number, txs: Transaction[]) => void) { this.event.on('executed', listener) }

  private async executeBlockTransactions () {
    if ((await this.blockchain.height) !== this.lastAppState.height) {
      const height = this.lastAppState.height + 1
      const knownHeight = await this.blockchain.height
      logger(`execute transaction in block(${height})`)
      const block = await this.blockchain.blockOf(height)
      const txs = block.body.transactionList.transactions
      const appState = await this.dapp.executeTransactions(txs)
      if (appState.height !== height) throw new Error('block height mismatch')
      if (appState.height < knownHeight) {
        const expect = (await this.blockchain.headerOf(appState.height + 1)).appStateHash
        if (!appState.hash.equals(expect)) throw new Error('app hash mismatch')
      }
      this._lastAppState = appState
      this.event.emit('executed', height, txs)
    }
  }
}
