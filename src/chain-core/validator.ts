import { Transaction, Blockchain, BlockData, Consensus, BlockHeader, Block } from 'chain-core/blockchain'
import { MerkleTree } from 'structure'
import { Bytes32 } from 'bytes'
import { KeyPair, Hash } from 'cryptography'
import * as dapi from 'chain-core/dapi'

class TransactionPool implements Iterable<Transaction> {
  private pool = new Map<string, Transaction>()

  public add (tx: Transaction) {
    this.pool.set(tx.toString(), tx)
  }

  public remove (txs: Iterable<Transaction>) {
    for (const tx of txs) {
      this.pool.delete(tx.toString())
    }
  }

  // implements IterableIterator
  [Symbol.iterator] (): Iterator<Transaction> {
    return this.pool.values()
  }
}

class ValidatorCore implements dapi.Core {
  constructor (
    private readonly validator: Validator
  ) {}

  sendTransaction (transaction: Transaction): void {
    this.validator.addTransaction(transaction)
  }
}

export class Validator {
  public readonly blockchain: Blockchain
  private readonly transactionPool = new TransactionPool()
  private readonly keyPair: KeyPair
  private readonly dapps: dapi.Dapps
  private lastAppStateHash: Hash

  private lastExecuteBlockHeight: number

  constructor (
    dappsConstructor: dapi.DappsConstructor,
    genesisBlock: Block,
    privateKey?: Bytes32
  ) {
    this.blockchain = new Blockchain(genesisBlock)
    this.keyPair = new KeyPair(privateKey)

    this.lastAppStateHash = genesisBlock.header.appStateHash
    this.lastExecuteBlockHeight = 0

    // init dapps
    const core = new ValidatorCore(this)
    this.dapps = new dappsConstructor(core)
  }

  public addTransaction (tx: Transaction) {
    this.transactionPool.add(tx)
  }

  public transactionsInPool (): Iterable<Transaction> {
    return this.transactionPool
  }

  public addReachedBlock (block: Block) {
    // validate and update app state
    // TODO: more validation
    if (this.blockchain.height() !== this.lastExecuteBlockHeight) { throw new Error('need execute last block transactions') }
    if (!block.header.appStateHash.equals(this.lastAppStateHash)) { throw new Error('invalid block') }
    this.blockchain.addBlock(block)
    this.transactionPool.remove(block.data.transactions)
  }

  public constructBlock () {
    if (this.blockchain.height() !== this.lastExecuteBlockHeight) { throw new Error('need execute last block transactions') }
    // TODO: select transaction intelligently
    const txs = Array.from(this.transactionPool)
    this.transactionPool.remove(txs)

    // TODO: 複数Validator対応
    // only my signature
    const lastBlockConsensus = new Consensus(0, new MerkleTree([this.keyPair.sign(this.blockchain.lastBlockHash())]))
    // unchangeable validator set
    const validatorSetHash = Hash.fromData('dummy')

    const data = new BlockData(new MerkleTree(txs), lastBlockConsensus)
    const header = new BlockHeader(
      this.blockchain.height() + 1,
      Math.floor((new Date().getTime()) / 1000),
      this.blockchain.lastBlockHash(),
      data.transactions.root,
      data.lastBlockConsensus.hash,
      this.lastAppStateHash,
      validatorSetHash
    )
    const block = new Block(data, header)
    this.blockchain.addBlock(block)
  }

  // update state
  public executeLastBlockTransactions () {
    if (this.blockchain.height() === this.lastExecuteBlockHeight) { throw new Error('already executed block') }
    const block = this.blockchain.lastBlock()
    for (const tx of block.data.transactions) {
      this.executeTransaction(tx)
    }
    this.lastAppStateHash = this.dapps.getAppStateHash()
    this.lastExecuteBlockHeight = block.header.height
  }

  private executeTransaction (tx: Transaction) {
    this.dapps.executeTransaction(tx)
  }
}
