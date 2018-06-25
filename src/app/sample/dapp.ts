import { Dapp, AppState } from '../../interface/dapi'
import { Transaction } from '../../structure/blockchain/transaction'
import { MerklePatriciaTrie } from '../../structure/merkle-patricia-trie'
import { InMemoryNodeStore } from '../../store/merkle-patricia-trie-node'
import { UInt64, deserialize, serialize } from '../../structure/serializable'
import debug from 'debug'
import { Address } from '../../structure/address'
const logger = debug('sample')

export class Sample implements Dapp {
  private height: number
  private db: MerklePatriciaTrie
  constructor (
  ) {
    this.db = new MerklePatriciaTrie(new InMemoryNodeStore())
    this.height = 0
  }

  public async connect (): Promise<AppState> {
    await this.db.init()
    const appState = await this.appState()
    logger('connected: %o', appState)
    return appState
  }

  public async validateTransaction (transaction: Transaction): Promise<boolean> {
    const txCount = await this.getTransactionCount(transaction.signer)
    logger('validate nonce: state:%d , tx:%d', txCount, transaction.data.nonce)
    return transaction.data.nonce > txCount
  }

  public async selectTransactions (transactions: Transaction[]): Promise<Transaction[]> {
    const selected: Transaction[] = []
    for (const tx of transactions) {
      if (tx.data.nonce === (await this.getTransactionCount(tx.signer)) + 1) {
        selected.push(tx)
      }
    }
    logger('selected %d transactions', selected.length)
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

  private async getTransactionCount (address: Address) {
    return (await this.db.get(address.buffer)).match(v => deserialize(v, UInt64.deserialize), () => 0)
  }

  private async setTransactionCount (address: Address, count: number) {
    await this.db.set(address.buffer, serialize(count, UInt64.serialize))
  }

  private async appState (): Promise<AppState> {
    const root = this.db.root
    return new AppState(this.height, root)
  }
}
