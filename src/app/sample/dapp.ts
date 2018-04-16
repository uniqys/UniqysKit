import { Dapp, AppState } from '../../interface/dapi'
import { KeyPair, Hash } from '../../structure/cryptography'
import { Transaction, TransactionData } from '../../structure/blockchain'
import debug from 'debug'
import { MerkleizedMemcached } from '../../merkleized-db/memcached-compatible-client'
const logger = debug('sample')

export class Sample implements Dapp {
  private height: number
  private keyPair: KeyPair
  private nonce: number
  private db: MerkleizedMemcached
  constructor (
    db: string
  ) {
    this.db = new MerkleizedMemcached(db)
    this.keyPair = new KeyPair()
    logger('app address: %s', this.keyPair.address)
    this.nonce = 0
    this.height = 0
  }

  public async connect (): Promise<AppState> {
    const appState = await this.appState()
    logger('connected: %o', appState)
    return appState
  }

  public async execute (transactions: Transaction[]): Promise<AppState> {
    let index = await new Promise<number | undefined>((resolve, reject) => this.db.get('transactions', (err, num) => err ? reject(err) : resolve(num))) || 0
    for (const tx of transactions) {
      await new Promise((resolve, reject) => this.db.set(`transactions:${index}`, tx.toString(), 0, (err) => err ? reject(err) : resolve()))
      index++
    }
    await new Promise((resolve, reject) => this.db.set('transactions', index, 0, (err, num) => err ? reject(err) : resolve(num)))
    this.height++
    const appState = await this.appState()
    logger('executed: %o', appState)
    return appState
  }

  public makeTransaction (data: Buffer | string): Transaction {
    this.nonce++
    const buffer = data instanceof Buffer ? data : new Buffer(data)
    const txd = new TransactionData(this.nonce, buffer)
    logger('make transaction: %s', buffer.toString('utf8'))
    return txd.sign(this.keyPair)
  }

  private async appState (): Promise<AppState> {
    const root = await new Promise<Buffer>((resolve, reject) => this.db.root((err, data) => err ? reject(err) : resolve(data)))
    return new AppState(this.height, new Hash(root))
  }
}
