import { BlockData, Consensus, BlockHeader, Block, Transaction } from 'chain-core/blockchain'
import { MerkleTree } from 'structure'
import { Hash, Signature } from 'cryptography'
import { Validator } from 'chain-core/validator'
import { Bytes32 } from 'bytes'
import { Dapps, Core } from 'chain-core/dapi'

// mock
let mockDapps: MockDapps
class MockDapps implements Dapps {
  public txCount = 0
  constructor (
    private readonly core: Core
  ) {
    mockDapps = this
  }
  executeTransaction (_: Transaction): void {
    console.log('aaa')
    this.txCount++
  }
  getAppStateHash (): Hash {
    return Hash.fromData(`state: ${this.txCount}`)
  }
  sendTransaction (tx: Transaction): void {
    this.core.sendTransaction(tx)
  }
}

/* tslint:disable:no-unused-expression */
describe('validator', () => {
  let genesis: Block
  beforeAll(() => {
    const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])))
    const lastBlockHash = Hash.fromData('genesis!')
    const state = Hash.fromData('genesis state')
    const validator = Hash.fromData('validator set')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, state, validator)
    genesis = new Block(data, header)
  })
  it('can create', () => {
    expect(() => { new Validator(MockDapps, genesis) }).not.toThrow()
  })
  it('can add transaction', () => {
    const validator = new Validator(MockDapps, genesis)
    const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
    const transaction = new Transaction(sign, 1234, new Buffer('The quick brown fox jumps over the lazy dog'))
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    validator.addTransaction(transaction)
    expect(Array.from(validator.transactionsInPool()).length).toBe(1)
    expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
  })
  describe('with dapps', () => {
    it('is sent transaction by dapps', () => {
      const validator = new Validator(MockDapps, genesis)
      const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
      const transaction = new Transaction(sign, 1234, new Buffer('Dapps transaction'))
      expect(Array.from(validator.transactionsInPool()).length).toBe(0)
      mockDapps.sendTransaction(transaction)
      expect(Array.from(validator.transactionsInPool()).length).toBe(1)
      expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
    })
    it('construct block', () => {
      const validator = new Validator(MockDapps, genesis)
      validator.executeLastBlockTransactions() // no txs in genesis
      const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
      mockDapps.sendTransaction(new Transaction(sign, 1234, new Buffer('Dapps transaction')))
      mockDapps.sendTransaction(new Transaction(sign, 1235, new Buffer('Dapps transaction')))
      expect(validator.blockchain.height()).toBe(1)
      expect(Array.from(validator.transactionsInPool()).length).toBe(2)
      validator.constructBlock()
      expect(validator.blockchain.height()).toBe(2)
      expect(Array.from(validator.transactionsInPool()).length).toBe(0)
      expect(validator.blockchain.lastBlock().data.transactions.items.length).toBe(2)
      expect(validator.blockchain.lastBlock().header.appStateHash.equals(Hash.fromData('state: 0'))).toBeTruthy()
    })
    it('execute last block transactions', () => {
      const validator = new Validator(MockDapps, genesis)
      // construct block include transactions
      validator.executeLastBlockTransactions() // no txs in genesis
      const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
      mockDapps.sendTransaction(new Transaction(sign, 1234, new Buffer('Dapps transaction')))
      mockDapps.sendTransaction(new Transaction(sign, 1235, new Buffer('Dapps transaction')))
      validator.constructBlock()
      expect(mockDapps.getAppStateHash().equals(Hash.fromData('state: 0'))).toBeTruthy()
      validator.executeLastBlockTransactions() // two txs executed
      expect(mockDapps.getAppStateHash().equals(Hash.fromData('state: 2'))).toBeTruthy()
    })
    it('add reach block include transactions', () => {
      const validator = new Validator(MockDapps, genesis)
      const dapps = mockDapps
      const validator2 = new Validator(MockDapps, genesis)
      const dapps2 = mockDapps
      validator.executeLastBlockTransactions() // no txs in genesis
      validator2.executeLastBlockTransactions() // no txs in genesis
      const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
      dapps.sendTransaction(new Transaction(sign, 1234, new Buffer('Dapps transaction')))
      dapps.sendTransaction(new Transaction(sign, 1235, new Buffer('Dapps transaction')))
      dapps2.sendTransaction(new Transaction(sign, 1234, new Buffer('Dapps transaction')))
      dapps2.sendTransaction(new Transaction(sign, 1235, new Buffer('Dapps transaction')))
      // construct block include transactions
      validator2.constructBlock()
      const block = validator2.blockchain.lastBlock()

      expect(validator.blockchain.height()).toBe(1)
      expect(Array.from(validator.transactionsInPool()).length).toBe(2)
      validator.addReachedBlock(block)
      expect(validator.blockchain.height()).toBe(2)
      expect(Array.from(validator.transactionsInPool()).length).toBe(0)
      expect(dapps.getAppStateHash().equals(Hash.fromData('state: 0'))).toBeTruthy()
      validator.executeLastBlockTransactions() // two txs executed
      expect(dapps.getAppStateHash().equals(Hash.fromData('state: 2'))).toBeTruthy()
    })
  })
  describe('error case', () => {
    it('cant construct block before execute last block transaction', () => {
      const validator = new Validator(MockDapps, genesis)
      const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
      mockDapps.sendTransaction(new Transaction(sign, 1234, new Buffer('Dapps transaction')))
      mockDapps.sendTransaction(new Transaction(sign, 1235, new Buffer('Dapps transaction')))
      expect(() => { validator.constructBlock() }).toThrow('need execute last block transactions')
    })
    it('cant execute block multiple times', () => {
      const validator = new Validator(MockDapps, genesis)
      expect(() => { validator.executeLastBlockTransactions() }).not.toThrow()
      expect(() => { validator.executeLastBlockTransactions() }).toThrow('already executed block')
    })
    it('cant add reach block before execute last block transaction', () => {
      const validator = new Validator(MockDapps, genesis)
      const validator2 = new Validator(MockDapps, genesis)
      validator2.executeLastBlockTransactions()
      validator2.constructBlock()
      const block = validator2.blockchain.lastBlock()

      expect(() => { validator.addReachedBlock(block) }).toThrow('need execute last block transactions')
    })
    it('cant add reached block contain invalid app state', () => {
      const validator = new Validator(MockDapps, genesis)
      const invalidValidator = new Validator(MockDapps, genesis)
      const invalidDapps = mockDapps
      // hack txCount
      invalidDapps.txCount++
      // construct invalid block
      invalidValidator.executeLastBlockTransactions()
      invalidValidator.constructBlock()
      const block = invalidValidator.blockchain.lastBlock()

      validator.executeLastBlockTransactions() // valid execute
      expect(() => { validator.addReachedBlock(block) }).toThrow('invalid block')
    })
  })
})
