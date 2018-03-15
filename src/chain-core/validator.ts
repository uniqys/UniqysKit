import { Transaction, Blockchain, BlockData, Consensus, BlockHeader, Block, ValidatorSet, Validator } from './blockchain'
import { MerkleTree } from '../structure'
import { KeyPair, Hash } from '../cryptography'
import * as dapi from './dapi'
import debug from 'debug'
const logger = debug('validator')

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

  get size (): number {
    return this.pool.size
  }

  // implements IterableIterator
  [Symbol.iterator] (): Iterator<Transaction> {
    return this.pool.values()
  }
}

abstract class Node {
  private immediateId: any = undefined

  public abstract mainLoop (): void
  public start () {
    const loop = () => {
      this.mainLoop()
      this.immediateId = setImmediate(loop)
    }
    loop()
  }

  public stop () {
    if (this.immediateId) { clearImmediate(this.immediateId) }
  }
}

class ValidatorCore<T extends dapi.Dapp> implements dapi.Core {
  constructor (
    private readonly validator: ValidatorNode<T>
  ) {}

  sendTransaction (transaction: Transaction): void {
    this.validator.addTransaction(transaction)
  }
}

export class ValidatorNode<T extends dapi.Dapp> extends Node {
  public readonly blockchain: Blockchain
  public readonly dapp: T
  private readonly transactionPool = new TransactionPool()
  private readonly keyPair: KeyPair
  private lastAppStateHash: Hash

  private lastExecuteBlockHeight: number

  constructor (
    dappsConstructor: dapi.DappsConstructor<T>,
    genesisBlock: Block,
    keyPair?: KeyPair
  ) {
    super()
    this.blockchain = new Blockchain(genesisBlock)
    this.keyPair = keyPair === undefined ? new KeyPair() : keyPair

    this.lastAppStateHash = genesisBlock.header.appStateHash
    this.lastExecuteBlockHeight = 0

    // init dapps
    const core = new ValidatorCore<T>(this)
    this.dapp = new dappsConstructor(core)
  }

  public mainLoop () {
    this.proceedConsensus()
  }

  public addTransaction (tx: Transaction) {
    this.transactionPool.add(tx)
  }

  public proceedConsensus () {
    if (this.transactionPool.size) {
      logger('transaction reached')
      this.constructBlock()
    }
    if (!this.lastAppStateHash.equals(this.blockchain.lastBlock().header.appStateHash)) {
      logger('need appState proof block')
      this.constructBlock()
    }
    if (this.blockchain.height() !== this.lastExecuteBlockHeight) {
      logger('execute last block')
      this.executeLastBlockTransactions()
    }
  }

  public transactionsInPool (): Iterable<Transaction> {
    return this.transactionPool
  }

  public addReachedBlock (block: Block) {
    // validate and update app state
    if (this.blockchain.height() !== this.lastExecuteBlockHeight) { throw new Error('need execute last block transactions') }
    if (!block.header.appStateHash.equals(this.lastAppStateHash)) { throw new Error('invalid block') }
    this.blockchain.validateNewBlock(block)
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
    const lastBlockConsensus = new Consensus(0, new MerkleTree([this.keyPair.sign(this.blockchain.lastBlock().hash)]))
    // unchangeable validator set
    const nextValidatorSet = new ValidatorSet([new Validator(this.keyPair.address, 100)])

    const data = new BlockData(new MerkleTree(txs), lastBlockConsensus, nextValidatorSet)
    const header = new BlockHeader(
      this.blockchain.height() + 1,
      Math.floor((new Date().getTime()) / 1000),
      this.blockchain.lastBlock().hash,
      data.transactions.root,
      data.lastBlockConsensus.hash,
      nextValidatorSet.root,
      this.lastAppStateHash
    )
    const block = new Block(data, header)
    this.blockchain.addBlock(block)

    logger(`add block(${block.header.height}): ${block.hash.buffer.toString('hex')}`)
  }

  // update state
  public executeLastBlockTransactions () {
    if (this.blockchain.height() === this.lastExecuteBlockHeight) { throw new Error('already executed block') }
    const block = this.blockchain.lastBlock()
    for (const tx of block.data.transactions) {
      this.executeTransaction(tx)
    }
    this.lastAppStateHash = this.dapp.getAppStateHash()
    this.lastExecuteBlockHeight = block.header.height
  }

  private executeTransaction (tx: Transaction) {
    this.dapp.executeTransaction(tx)
  }
}
