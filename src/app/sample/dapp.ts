import { Dapp, AppState } from '../../interface/dapi'
import { KeyPair, Hash } from '../../cryptography'
import { Transaction, TransactionData } from '../../chain-core/blockchain'
import debug from 'debug'
const logger = debug('sample')

export class Sample implements Dapp {
  private height: number = 0
  private transactions: Transaction[]
  private keyPair: KeyPair
  private nonce: number
  constructor (
  ) {
    this.transactions = []
    this.keyPair = new KeyPair()
    logger('app address: %s', this.keyPair.address)
    this.nonce = 0
  }

  public connect (): Promise<AppState> {
    logger('connected: %s', this.appStateMessage)
    return Promise.resolve(this.appState)
  }

  public async execute (transactions: Transaction[]): Promise<AppState> {
    for (const tx of transactions) {
      this.transactions.push(tx)
    }
    this.height++
    logger('executed: %s', this.appStateMessage)
    return this.appState
  }
  makeTransaction (data: Buffer | string): Transaction {
    this.nonce++
    const buffer = data instanceof Buffer ? data : new Buffer(data)
    const txd = new TransactionData(this.nonce, buffer)
    logger('make transaction: %s', buffer.toString('utf8'))
    return txd.sign(this.keyPair)
  }

  private get appState (): AppState {
    return new AppState(this.height, Hash.fromData(this.appStateMessage))
  }

  private get appStateMessage (): string {
    return `tx height: ${ this.transactions.length }`
  }
}
