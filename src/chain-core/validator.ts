import { Transaction, Blockchain, BlockData, Consensus, BlockHeader, Block, ValidatorSet, Validator } from '../structure/blockchain'
import { MerkleTree } from '../structure/merkle-tree'
import { KeyPair } from '../structure/cryptography'
import * as dapi from '../interface/dapi'
import { EventEmitter } from 'events'
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

export abstract class Node extends EventEmitter {
  private immediateId: any = undefined

  public start () {
    const loop = () => {
      this.mainLoop()
        .then(() => {
          this.immediateId = setImmediate(loop)
        })
        .catch((e) => {
          this.emit('error', e)
          this.stop()
        })
    }
    loop()
  }

  public stop () {
    if (this.immediateId !== undefined) {
      clearImmediate(this.immediateId)
      this.immediateId = undefined
    }
    this.emit('end')
  }

  protected abstract async mainLoop (): Promise<void>
}

export class ValidatorNode<T extends dapi.Dapp> extends Node implements dapi.Core {
  public readonly blockchain: Blockchain
  private readonly dapp: T
  private initialized: Boolean = false
  private readonly transactionPool = new TransactionPool()
  private readonly keyPair: KeyPair
  private lastAppState?: dapi.AppState
  private isConsensusInProgress: boolean = false

  constructor (
    dapp: T,
    genesisBlock: Block,
    keyPair?: KeyPair
  ) {
    super()
    this.blockchain = new Blockchain(genesisBlock)
    this.keyPair = keyPair === undefined ? new KeyPair() : keyPair

    this.dapp = dapp
  }

  public sendTransaction (transaction: Transaction): Promise<void> {
    return Promise.resolve(this.addTransaction(transaction))
  }

  public async proceedConsensusUntilSteady () {
    if (!this.initialized) {
      await this.initialize()
    }
    do {
      await this.proceedConsensus()
    } while (this.isConsensusInProgress)
  }

  public addTransaction (tx: Transaction) {
    this.transactionPool.add(tx)
  }

  public transactionsInPool (): Iterable<Transaction> {
    return this.transactionPool
  }

  public async addReachedBlock (block: Block) {
    // proceed in progress consensus
    if (this.isConsensusInProgress) { await this.proceedConsensusUntilSteady() }
    // already have block
    if (block.header.height <= this.blockchain.height) {
      if (!this.blockchain.blockOf(block.header.height).hash.equals(block.hash)) { throw new Error('invalid block') }
      return
    }
    // validate and update app state
    this.blockchain.validateNewBlock(block)
    this.blockchain.addBlock(block)
    this.transactionPool.remove(block.data.transactions)
  }

  protected async mainLoop () {
    if (!this.initialized) {
      await this.initialize()
    }
    await this.proceedConsensus()
  }

  private async initialize () {
    // connect dapp
    this.lastAppState = await this.dapp.connect()
    if (this.lastAppState.height > this.blockchain.height) { throw new Error('need reset app') }
    logger(`initialized at block(${this.lastAppState.height})`)
    this.initialized = true
  }

  private async proceedConsensus () {
    if (this.lastAppState === undefined) { throw new Error('not initialized') }
    if (this.blockchain.height !== this.lastAppState.height) {
      logger(`execute transaction in block(${this.lastAppState.height + 1})`)
      await this.executeBlockTransactions()
      this.isConsensusInProgress = true
      return
    }
    if (this.transactionPool.size) {
      logger('transaction reached')
      this.constructBlock()
      this.isConsensusInProgress = true
      return
    }
    if (!this.lastAppState.hash.equals(this.blockchain.lastBlock.header.appStateHash)) {
      logger('need appState proof block')
      this.constructBlock()
      this.isConsensusInProgress = true
      return
    }
    this.isConsensusInProgress = false
  }

  private async executeBlockTransactions () {
    if (this.lastAppState === undefined) { throw new Error('not initialized') }
    if (this.blockchain.height === this.lastAppState.height) { throw new Error('all block executed') }
    const block = this.blockchain.blockOf(this.lastAppState.height + 1)
    const appState = await this.dapp.execute(block.data.transactions.items)
    if (appState.height !== block.header.height) { throw new Error('block height mismatch') }
    this.lastAppState = appState
  }

  private constructBlock () {
    if (this.lastAppState === undefined) { throw new Error('not initialized') }
    if (this.blockchain.height !== this.lastAppState.height) { throw new Error('need execute last block transactions') }
    // TODO: select transaction intelligently
    const txs = Array.from(this.transactionPool)
    this.transactionPool.remove(txs)

    // TODO: 複数Validator対応
    // only my signature
    const lastBlockConsensus = new Consensus(0, new MerkleTree([this.keyPair.sign(this.blockchain.lastBlock.hash)]))
    // unchangeable validator set
    const nextValidatorSet = new ValidatorSet([new Validator(this.keyPair.address, 100)])

    const data = new BlockData(new MerkleTree(txs), lastBlockConsensus, nextValidatorSet)
    const header = new BlockHeader(
      this.blockchain.height + 1,
      Math.floor((new Date().getTime()) / 1000),
      this.blockchain.lastBlock.hash,
      data.transactions.root,
      data.lastBlockConsensus.hash,
      nextValidatorSet.root,
      this.lastAppState.hash
    )
    const block = new Block(data, header)
    this.blockchain.addBlock(block)

    logger(`add block(${block.header.height}): ${block.hash.buffer.toString('hex')}`)
  }
}
