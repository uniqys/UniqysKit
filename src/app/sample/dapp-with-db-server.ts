import { Dapp, AppState } from '../../interface/dapi'
import { Hash } from '../../structure/cryptography'
import { Transaction } from '../../structure/blockchain/transaction'
import debug from 'debug'
import { MerkleizedMemcached } from '../../merkleized-db/memcached-compatible-client'
import { Address } from '../../structure/address'
const logger = debug('sample')

export class Sample implements Dapp {
  private height: number
  private db: MerkleizedMemcached
  constructor (
    db: string
  ) {
    this.db = new MerkleizedMemcached(db)
    this.height = 0
  }

  public async connect (): Promise<AppState> {
    const appState = await this.appState()
    logger('connected: %o', appState)
    return appState
  }

  public async validateTransaction (transaction: Transaction): Promise<boolean> {
    const txCount = await this.getTransactionCount(transaction.signer)
    return transaction.data.nonce > txCount
  }

  public async selectTransactions (transactions: Transaction[]): Promise<Transaction[]> {
    const selected: Transaction[] = []
    for (const tx of transactions) {
      if (tx.data.nonce === (await this.getTransactionCount(tx.signer)) + 1) {
        selected.push(tx)
      }
    }
    return selected
  }

  public async executeTransactions (transactions: Transaction[]): Promise<AppState> {
    for (const tx of transactions) {
      const address = tx.signer
      const txCount = await this.getTransactionCount(address)
      await this.setTransactionCount(address, txCount + 1)
    }
    this.height++
    const appState = await this.appState()
    logger('executed: %o', appState)
    return appState
  }

  private getTransactionCount (address: Address) {
    return new Promise<number>((resolve, reject) => this.db.get(`${address.toString()}`, (err, num) => err ? reject(err) : resolve(num || 0)))
  }

  private setTransactionCount (address: Address, count: number) {
    return new Promise((resolve, reject) => this.db.set(`${address.toString()}`, count, 0, (err) => err ? reject(err) : resolve()))
  }

  private async appState (): Promise<AppState> {
    const root = await new Promise<Buffer>((resolve, reject) => this.db.root((err, data) => err ? reject(err) : resolve(data)))
    return new AppState(this.height, new Hash(root))
  }
}
