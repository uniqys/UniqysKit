import { Block, BlockHeader, BlockBody } from './block'
import { TransactionList } from './transaction'
import { Consensus, ValidatorSet } from './consensus'
import { Hash } from '../cryptography'

/* tslint:disable:no-unused-expression */
describe('block', () => {
  it('can create', () => {
    const body = new BlockBody(new TransactionList([]), new Consensus([]), new ValidatorSet([]))
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, body.transactionList.hash, body.lastBlockConsensus.hash, body.nextValidatorSet.hash, state)
    expect(() => { new Block(header, body) }).not.toThrow()
  })
  it('validate on valid block', async () => {
    const body = new BlockBody(new TransactionList([]), new Consensus([]), new ValidatorSet([]))
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, body.transactionList.hash, body.lastBlockConsensus.hash, body.nextValidatorSet.hash, state)
    const block = new Block(header, body)
    expect(() => { block.validate() }).not.toThrow()
  })
  it('can not validate on invalid block', () => {
    const body = new BlockBody(new TransactionList([]), new Consensus([]), new ValidatorSet([]))
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
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
