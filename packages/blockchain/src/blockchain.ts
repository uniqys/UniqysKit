import { Block, BlockHeader, BlockBody } from './block'
import { Consensus, ValidatorSet } from './consensus'
import { Hash } from '@uniqys/signature'
import { BlockStore } from './block-store'

export class Blockchain {
  private isReady = false
  constructor (
    public readonly blockStore: BlockStore,
    public readonly genesisBlock: Block,
    public readonly initialValidatorSet: ValidatorSet
  ) { }
  public async ready (): Promise<void> {
    if (this.isReady) { return Promise.resolve() }
    await this.blockStore.rwLock.writeLock.use(async () => {
      const height = await this.blockStore.getHeight()
      if (height === 0) {
        await Promise.all([
          this.blockStore.setHeader(1, this.genesisBlock.header),
          this.blockStore.setBody(1, this.genesisBlock.body)
        ])
      }
    })
    const storedGenesis = await this.blockStore.getHeader(1)
    if (!storedGenesis.hash.equals(this.genesisBlock.hash)) {
      throw new Error('Stored genesis block is invalid. You need to reset store.')
    }
    this.isReady = true
  }

  public async hashOf (height: number): Promise<Hash> {
    return (await this.blockStore.getHeader(height)).hash
  }
  public async headerOf (height: number): Promise<BlockHeader> {
    return this.blockStore.getHeader(height)
  }
  public async bodyOf (height: number): Promise<BlockBody> {
    return this.blockStore.getBody(height)
  }
  public async blockOf (height: number): Promise<Block> {
    this.checkReady()
    const [header, body] = await Promise.all([
      this.blockStore.getHeader(height),
      this.blockStore.getBody(height)
    ])
    return new Block(header, body)
  }
  public async consensusOf (height: number): Promise<Consensus> {
    this.checkReady()
    return this.blockStore.rwLock.readLock.use(async () => {
      const chainHeight = await this.blockStore.getHeight()
      if (chainHeight === height) {
        // no next block
        return this.blockStore.getLastConsensus()
      } else {
        // this block consensus is next block lastBlockConsensus
        const block = await this.blockStore.getBody(height + 1)
        return block.lastBlockConsensus
      }
    })
  }
  public get height (): Promise<number> {
    return (async () => {
      this.checkReady()
      return this.blockStore.getHeight()
    })()
  }
  private checkReady () {
    if (!this.isReady) { throw new Error('blockchain is not ready') }
  }
}
