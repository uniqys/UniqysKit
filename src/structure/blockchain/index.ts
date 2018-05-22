
import { Block } from './block'
import { ValidatorSet } from './consensus'

export interface BlockStore {
  get (height: number): Promise<Block>
  push (block: Block): Promise<void>
  height (): Promise<number>
}

export class Blockchain {
  private isReady = false
  constructor (
    public readonly blockStore: BlockStore,
    public readonly genesisBlock: Block
  ) { }
  public async ready (): Promise<void> {
    if (this.isReady) { return Promise.resolve() }
    const height = await this.blockStore.height()
    if (height === 0) {
      await this.blockStore.push(this.genesisBlock)
    }
    if (!(await this.blockStore.get(1)).hash.equals(this.genesisBlock.hash)) {
      throw new Error('Stored genesis block is invalid. You need to reset store.')
    }
    this.isReady = true
  }

  public async blockOf (height: number): Promise<Block> {
    this.checkReady()
    return this.blockStore.get(height)
  }
  public async validatorSetOf (height: number): Promise<ValidatorSet> {
    this.checkReady()
    // this block validatorSet is last block nextValidatorSet
    return (await this.blockOf(Math.max(height - 1, 1))).body.nextValidatorSet
  }
  public get lastBlock (): Promise<Block> {
    return (async () => this.blockOf(await this.height))()
  }
  public get lastValidatorSet (): Promise<ValidatorSet> {
    return (async () => this.validatorSetOf(await this.height))()
  }
  public get height (): Promise<number> {
    return (async () => {
      this.checkReady()
      return this.blockStore.height()
    })()
  }
  public async addBlock (block: Block): Promise<void> {
    this.checkReady()
    await this.blockStore.push(block)
  }
  public async validateNewBlock (block: Block): Promise<void> {
    this.checkReady()
    const lastBlock = await this.lastBlock
    const lastValidatorSet = await this.lastValidatorSet
    if (!(block.header.height === lastBlock.header.height + 1)) { throw new Error('invalid block height') }
    if (!(block.header.timestamp >= lastBlock.header.timestamp)) { throw new Error('invalid block timestamp') }
    if (!(block.header.lastBlockHash.equals(lastBlock.hash))) { throw new Error('invalid lastBlockHash') }
    // validate data
    block.validate()
    // verify consensus
    block.body.lastBlockConsensus.validate(lastBlock.hash, lastValidatorSet)
  }
  private checkReady () {
    if (!this.isReady) { throw new Error('blockchain is not ready') }
  }
}
