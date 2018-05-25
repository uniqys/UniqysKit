import { Blockchain } from './index'
import { InMemoryBlockStore } from '../../store/block'
import { Block, BlockHeader, BlockBody } from './block'
import { TransactionList } from './transaction'
import { Consensus, ValidatorSet, Validator } from './consensus'
import { Hash, KeyPair } from '../cryptography'

/* tslint:disable:no-unused-expression */
describe('blockchain', () => {
  let signer: KeyPair
  let validatorSet: ValidatorSet
  let genesis: Block
  beforeAll(() => {
    signer = new KeyPair()
    validatorSet = new ValidatorSet([ new Validator(signer.address, 100) ])
    genesis = Block.construct(1, 100, Hash.fromData('genesis'), Hash.fromData('state'),
      new TransactionList([]), new Consensus([]), validatorSet)
  })
  it('can create', () => {
    expect(() => { new Blockchain(new InMemoryBlockStore(), genesis) }).not.toThrow()
  })
  it('need to make ready', async () => {
    const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
    await expect(blockchain.height).rejects.toThrow()
    await blockchain.ready()
    expect(await blockchain.height).toBe(1)
  })
  it('can get block of height', async () => {
    const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
    await blockchain.ready()
    expect(await blockchain.height).toBe(1)
    expect((await blockchain.lastBlock).hash.equals(genesis.hash)).toBeTruthy()
    const block = Block.construct(2, 110, genesis.hash, Hash.fromData('state'), new TransactionList([]), new Consensus([]), validatorSet)
    await blockchain.addBlock(block)
    expect(await blockchain.height).toBe(2)
    expect((await blockchain.lastBlock).hash.equals(block.hash)).toBeTruthy()
    expect((await blockchain.blockOf(1)).hash.equals(genesis.hash)).toBeTruthy()
    expect((await blockchain.blockOf(2)).hash.equals(block.hash)).toBeTruthy()
    await expect(blockchain.blockOf(3)).rejects.toThrow()
  })
  it('can get validator set of height', async () => {
    const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
    await blockchain.ready()
    const nextValidatorSet = new ValidatorSet([ new Validator(signer.address, 200) ])
    const block = Block.construct(2, 110, genesis.hash, Hash.fromData('state'), new TransactionList([]), new Consensus([]), nextValidatorSet)
    await blockchain.addBlock(block)
    expect((await blockchain.validatorSetOf(1)).hash.equals(validatorSet.hash)).toBeTruthy()
    expect((await blockchain.validatorSetOf(2)).hash.equals(validatorSet.hash)).toBeTruthy()
    expect((await blockchain.validatorSetOf(3)).hash.equals(nextValidatorSet.hash)).toBeTruthy()
    await expect(blockchain.validatorSetOf(4)).rejects.toThrow()
  })
  describe('validate new block', () => {
    it('not throw if valid new block', async () => {
      const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
      await blockchain.ready()
      const block = Block.construct(2, 110, genesis.hash, Hash.fromData('state2'), new TransactionList([]),
        new Consensus([signer.sign(genesis.hash)]), validatorSet)
      await expect(blockchain.validateNewBlock(block)).resolves.not.toThrow()
    })
    it('throw if invalid hash of body', async () => {
      const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
      await blockchain.ready()
      const body = new BlockBody(new TransactionList([]), new Consensus([signer.sign(genesis.hash)]), validatorSet)
      const header = new BlockHeader(2, 110, genesis.hash,
        Hash.fromData('invalid'), body.lastBlockConsensus.hash, body.nextValidatorSet.hash, Hash.fromData('state2'))
      const block = new Block(header, body)
      await expect(blockchain.validateNewBlock(block)).rejects.toThrow()
    })
    it('throw if invalid height', async () => {
      const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
      await blockchain.ready()
      const block = Block.construct(3, 110, genesis.hash, Hash.fromData('state2'), new TransactionList([]),
        new Consensus([signer.sign(genesis.hash)]), validatorSet)
      await expect(blockchain.validateNewBlock(block)).rejects.toThrow()
    })
    it('throw if invalid timestamp', async () => {
      const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
      await blockchain.ready()
      const block = Block.construct(2, 90, genesis.hash, Hash.fromData('state2'), new TransactionList([]),
        new Consensus([signer.sign(genesis.hash)]), validatorSet)
      await expect(blockchain.validateNewBlock(block)).rejects.toThrow()
    })
    it('throw if invalid lastBlockHash', async () => {
      const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
      await blockchain.ready()
      const block = Block.construct(2, 110, Hash.fromData('invalid'), Hash.fromData('state2'), new TransactionList([]),
        new Consensus([signer.sign(genesis.hash)]), validatorSet)
      await expect(blockchain.validateNewBlock(block)).rejects.toThrow()
    })
    it('throw if invalid consensus', async () => {
      const blockchain = new Blockchain(new InMemoryBlockStore(), genesis)
      await blockchain.ready()
      const block = Block.construct(2, 110, Hash.fromData('invalid'), Hash.fromData('state2'), new TransactionList([]),
        new Consensus([]), validatorSet)
      await expect(blockchain.validateNewBlock(block)).rejects.toThrow()
    })
  })
})
