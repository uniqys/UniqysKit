import { Block, BlockHeader, BlockBody } from './block'
import { Hash } from '@uniqys/signature'
import { TransactionList } from './transaction'
import { Consensus, ValidatorSet, Vote } from './consensus'
import { deserialize, serialize } from '@uniqys/serialize'

describe('BlockBody', () => {
  it('serialize and deserialize', () => {
    const body = new BlockBody(new TransactionList([]), new Consensus(new Vote(0, 1, Hash.fromData('foo')), []), new ValidatorSet([]))
    expect(deserialize(serialize(body), BlockBody.deserialize)).toEqual(body)
  })
})
describe('BlockHeader', () => {
  it('serialize and deserialize', () => {
    const lastBlockHash = Hash.fromData('foo')
    const transactionsHash = Hash.fromData('transactions')
    const lastBlockConsensusHash = Hash.fromData('consensus')
    const nextValidatorSetHash = Hash.fromData('validator set')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, transactionsHash, lastBlockConsensusHash, nextValidatorSetHash, state)
    expect(deserialize(serialize(header), BlockHeader.deserialize).hash).toEqual(header.hash)
  })
})
describe('Block', () => {
  it('serialize and deserialize', () => {
    const height = 1
    const epoch = 1520825696
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const transactions: TransactionList = new TransactionList([])
    const consensus = new Consensus(new Vote(0, 1, Hash.fromData('foo')), [])
    const validatorSet = new ValidatorSet([])
    const block = Block.construct(height, epoch, lastBlockHash, state, transactions, consensus, validatorSet)
    expect(block).toBeInstanceOf(Block)
    expect(deserialize(serialize(block), Block.deserialize)).toEqual(block)
  })
})

/* tslint:disable:no-unused-expression */
describe('block', () => {
  const body = new BlockBody(new TransactionList([]), new Consensus(new Vote(0, 1, Hash.fromData('foo')), []), new ValidatorSet([]))
  const lastBlockHash = Hash.fromData('foo')
  const state = Hash.fromData('bar')
  const epoch = 1520825696
  const header = new BlockHeader(1, epoch, lastBlockHash, body.transactionList.hash, body.lastBlockConsensus.hash, body.nextValidatorSet.hash, state)
  it('validate on valid block', async () => {
    const block = new Block(header, body)
    expect(() => { block.validate() }).not.toThrow()
  })
  it('can not validate on invalid block', () => {
    const invalidHash = Hash.fromData('buzz')
    {
      const header = new BlockHeader(1, epoch, lastBlockHash, invalidHash, body.lastBlockConsensus.hash, body.nextValidatorSet.hash, state)
      expect(() => { new Block(header, body).validate() }).toThrow()
    }
    {
      const header = new BlockHeader(1, epoch, lastBlockHash, body.transactionList.hash, invalidHash, body.nextValidatorSet.hash, state)
      expect(() => { new Block(header, body).validate() }).toThrow()
    }
    {
      const header = new BlockHeader(1, epoch, lastBlockHash, body.transactionList.hash, body.lastBlockConsensus.hash, invalidHash, state)
      expect(() => { new Block(header, body).validate() }).toThrow()
    }
  })
})
