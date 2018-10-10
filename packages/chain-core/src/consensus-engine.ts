import { Block, Blockchain, TransactionList, Transaction, Consensus, Vote, ConsensusMessage } from '@uniqys/blockchain'
import { KeyPair } from '@uniqys/signature'
import { AsyncLoop } from '@uniqys/async-loop'
import debug from 'debug'
import { EventEmitter } from 'events'
import { TransactionPool } from './transaction-pool'
import { Synchronizer } from './synchronizer'
import { Executor } from './executor'
const logger = debug('chain-core:consensus')

enum ConsensusStep { Wait, Proposed, Committed }
export class ConsensusEngine {
  private consensusLoop = new AsyncLoop(() => this.proceedConsensus())
  private blockInConsensus?: Block
  private step = ConsensusStep.Wait
  private readonly event = new EventEmitter()

  constructor (
    private readonly blockchain: Blockchain,
    private readonly transactionPool: TransactionPool,
    private readonly synchronizer: Synchronizer,
    private readonly executor: Executor,
    private readonly _keyPair?: KeyPair
  ) {
    this.consensusLoop.on('error', err => this.event.emit('error', err))
  }
  public get keyPair (): KeyPair {
    if (!this._keyPair) { throw new Error('not validator') }
    return this._keyPair
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }

  public start () {
    if (this._keyPair) {
      logger('start consensus loop %s', this.keyPair.address.toString())
      this.consensusLoop.start()
    }
  }

  public stop () {
    this.consensusLoop.stop()
  }

  private async proceedConsensus () {
    const height = await this.blockchain.height
    switch (this.step) {
      case ConsensusStep.Wait: {
        if (height === this.executor.lastAppState.height) {
          const transactions = await this.transactionPool.selectTransactions()
          if (height === 0) {
            logger('genesis')
            this.proposeBlock(this.blockchain.genesisBlock)
            return
          }
          if (transactions.length > 0) {
            logger('has transactions')
            this.proposeBlock(await this.constructBlock(transactions))
            return
          }
          if (!this.executor.lastAppState.hash.equals((await this.blockchain.blockOf(height)).header.appStateHash)) {
            logger('need appState proof block')
            this.proposeBlock(await this.constructBlock([]))
            return
          }
        }
        break
      }
      case ConsensusStep.Proposed: {
        if (!this.blockInConsensus) { throw new Error('invalid state transition') }
        this.commitBlock(this.blockInConsensus)
        break
      }
      case ConsensusStep.Committed: {
        if (!this.blockInConsensus) { throw new Error('invalid state transition') }
        // chained
        if (this.blockInConsensus.header.height === height) {
          this.step = ConsensusStep.Wait
        }
        break
      }
    }
  }

  private async constructBlock (transactions: Transaction[]): Promise<Block> {
    const height = await this.blockchain.height

    const lastBlockHash = await this.blockchain.hashOf(height)
    const lastBlockConsensus = await this.blockchain.consensusOf(height)
    const nextValidatorSet = await this.blockchain.validatorSetOf(height + 1) // static validator set
    const block = Block.construct(
      height + 1, Math.floor((new Date().getTime()) / 1000), lastBlockHash, this.executor.lastAppState.hash,
      new TransactionList(transactions), lastBlockConsensus, nextValidatorSet
    )

    return block
  }

  private proposeBlock (block: Block) {
    this.blockInConsensus = block
    this.step = ConsensusStep.Proposed
    logger(`propose block(${block.header.height}): ${block.hash.buffer.toString('hex')}`)
  }

  private commitBlock (block: Block) {
    const vote = new Vote(block.header.height, 1, block.hash)
    const digest = ConsensusMessage.PreCommitMessage.digest(vote, this.blockchain.genesisBlock.hash)
    const consensus = new Consensus(vote, [this.keyPair.sign(digest)]) // only my signature
    this.synchronizer.newBlockFromLocal(block, consensus)
    this.step = ConsensusStep.Committed

    logger(`add block(${block.header.height}): ${block.hash.buffer.toString('hex')}`)
  }
}
