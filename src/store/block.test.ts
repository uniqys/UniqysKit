import { Block } from '../structure/blockchain/block'
import { TransactionList } from '../structure/blockchain/transaction'
import { ValidatorSet, Consensus } from '../structure/blockchain/consensus'
import { LevelDownBlockStore, InMemoryBlockStore } from './block'
import MemDown from 'memdown'
import { Hash } from '../structure/cryptography'

describe('block store', () => {
  let block1: Block
  let block2: Block
  beforeAll(() => {
    block1 = Block.construct(1, 100, Hash.fromData('genesis'), Hash.fromData('state'),
        new TransactionList([]), new Consensus([]), new ValidatorSet([]))
    block2 = Block.construct(2, 110, Hash.fromData('block1'), Hash.fromData('state'),
        new TransactionList([]), new Consensus([]), new ValidatorSet([]))
  })
  describe('in memory implementation', () => {
    it('initial height is 0', async () => {
      const store = new InMemoryBlockStore()
      expect(await store.height()).toBe(0)
    })
    it('push block and update height', async () => {
      const store = new InMemoryBlockStore()
      await store.push(block1)
      expect(await store.height()).toBe(1)
      await store.push(block2)
      expect(await store.height()).toBe(2)
    })
    it('can get pushed block by height', async () => {
      const store = new InMemoryBlockStore()
      await store.push(block1)
      await store.push(block2)
      expect((await store.get(1)).hash.equals(block1.hash)).toBeTruthy()
      expect((await store.get(2)).hash.equals(block2.hash)).toBeTruthy()
    })
    it('throw if height out of range', async () => {
      const store = new InMemoryBlockStore()
      await store.push(block1)
      await expect(store.get(2)).rejects.toThrow()
    })
  })
  describe('leveldown implementation', () => {
    it('initial height is 0', async () => {
      const store = new LevelDownBlockStore(new MemDown())
      expect(await store.height()).toBe(0)
    })
    it('push block and update height', async () => {
      const store = new LevelDownBlockStore(new MemDown())
      await store.push(block1)
      expect(await store.height()).toBe(1)
      await store.push(block2)
      expect(await store.height()).toBe(2)
    })
    it('can get pushed block by height', async () => {
      const store = new LevelDownBlockStore(new MemDown())
      await store.push(block1)
      await store.push(block2)
      expect((await store.get(1)).hash.equals(block1.hash)).toBeTruthy()
      expect((await store.get(2)).hash.equals(block2.hash)).toBeTruthy()
    })
    it('throw if height out of range', async () => {
      const store = new LevelDownBlockStore(new MemDown())
      await store.push(block1)
      await expect(store.get(2)).rejects.toThrow()
    })
  })
})
