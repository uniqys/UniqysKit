import { Block } from '../structure/blockchain/block'
import { TransactionList } from '../structure/blockchain/transaction'
import { ValidatorSet, Consensus } from '../structure/blockchain/consensus'
import { LevelDownBlockStore, InMemoryBlockStore } from './block'
import MemDown from 'memdown'
import { Hash } from '../structure/cryptography'
import { BlockStore } from '../structure/blockchain'
import { promisify } from 'util'

describe.each([
  ['in memory implementation', () => new InMemoryBlockStore()],
  ['leveldown implementation', () => new LevelDownBlockStore(new MemDown())]
])('block store of %s', (_, ctor) => {
  let block: Block
  let store: BlockStore
  beforeAll(() => {
    block = Block.construct(1, 100, Hash.fromData('genesis'), Hash.fromData('state'),
        new TransactionList([]), new Consensus([]), new ValidatorSet([]))
  })
  beforeEach(() => {
    store = ctor()
  })
  it('initial height is 0', async () => {
    expect(await store.getHeight()).toBe(0)
  })
  it('set and get height', async () => {
    await store.setHeight(10)
    expect(await store.getHeight()).toBe(10)
  })
  it('set and get last consensus', async () => {
    await store.setLastConsensus(block.body.lastBlockConsensus)
    expect(await store.getLastConsensus()).toEqual(block.body.lastBlockConsensus)
  })
  it('set and get header of height', async () => {
    await store.setHeader(2, block.header)
    expect(await store.getHeader(2)).toEqual(block.header)
  })
  it('set and get body of height', async () => {
    await store.setBody(2, block.body)
    expect(await store.getBody(2)).toEqual(block.body)
  })
  it('throw if not stored', async () => {
    await expect(store.getHeader(1)).rejects.toThrow()
    await expect(store.getBody(1)).rejects.toThrow()
  })
  it('can lock for concurrent access', async () => {
    const increment = async () => {
      const height = await store.getHeight()
      await promisify(setTimeout)(50)
      await store.setHeight(height + 1)
    }
    await Promise.all([store.lock(increment), store.lock(increment)])
    expect(await store.getHeight()).toBe(2)

  })
})
