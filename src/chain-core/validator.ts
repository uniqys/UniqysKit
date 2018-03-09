import { Transaction, Blockchain } from 'chain-core/blockchain'
import { Hash } from 'cryptography'

class TransactionPool implements IterableIterator<Transaction> {
  private pool = new Map<string, Transaction>()

  public add (tx: Transaction) {
    this.pool.set(tx.toString(), tx)
  }

  public remove (txs: IterableIterator<Transaction>) {
    for (const tx of txs) {
      this.pool.delete(tx.toString())
    }
  }

  // implements IterableIterator
  [Symbol.iterator] (): IterableIterator<Transaction> {
    return this
  }
  public next () { return this.pool.values().next() }
}

export class Validator {
  public readonly blockchain: Blockchain
  private readonly transactionPool = new TransactionPool()

  constructor (
    genesisHash: Hash
  ) {
    this.blockchain = new Blockchain(genesisHash)
  }

  public addTransaction (tx: Transaction) {
    this.transactionPool.add(tx)
  }

  public createBlock () {
    // const txs = Array.from(this.transactionPool)
    // TODO: Blockchainを伸ばす
  }
}
