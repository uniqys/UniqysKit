import { ValidatorNode } from './validator'
import { BlockData, Consensus, BlockHeader, Block, Transaction, ValidatorSet, Validator, TransactionData } from './blockchain'
import { MerkleTree } from '../structure'
import { Hash, Signature, KeyPair, Signer } from '../cryptography'
import { Bytes32 } from '../bytes'
import { Dapp, Core } from './dapi'

// mock
class MockDapps implements Dapp {
  public txCount = 0
  constructor (
    private readonly core: Core
  ) { }

  executeTransaction (_: Transaction): void {
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
  let keyPair: KeyPair
  let signer: Signer
  beforeAll(() => {
    keyPair = new KeyPair()
    const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), new ValidatorSet([new Validator(keyPair.address, 10)]))
    const lastBlockHash = Hash.fromData('genesis!')
    const state = Hash.fromData('genesis state')
    const validator = Hash.fromData('validator set')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, state, validator)
    genesis = new Block(data, header)
    signer = { sign: (_: Hash) => { return new Signature(new Bytes32(new Buffer(32)), 0) } }
  })
  it('can create', () => {
    expect(() => { new ValidatorNode(MockDapps, genesis) }).not.toThrow()
  })
  it('can add transaction', () => {
    const validator = new ValidatorNode(MockDapps, genesis, keyPair)
    const transaction = new TransactionData(1234, new Buffer('The quick brown fox jumps over the lazy dog')).sign(signer)
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    validator.addTransaction(transaction)
    expect(Array.from(validator.transactionsInPool()).length).toBe(1)
    expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
  })
  describe('with dapps', () => {
    it('is sent transaction by dapps', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      const transaction = new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer)
      expect(Array.from(validator.transactionsInPool()).length).toBe(0)
      validator.dapp.sendTransaction(transaction)
      expect(Array.from(validator.transactionsInPool()).length).toBe(1)
      expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
    })
    it('construct block', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      validator.executeLastBlockTransactions() // no txs in genesis
      validator.dapp.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
      validator.dapp.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
      expect(validator.blockchain.height()).toBe(1)
      expect(Array.from(validator.transactionsInPool()).length).toBe(2)
      validator.constructBlock()
      expect(validator.blockchain.height()).toBe(2)
      expect(Array.from(validator.transactionsInPool()).length).toBe(0)
      expect(validator.blockchain.lastBlock().data.transactions.items.length).toBe(2)
      expect(validator.blockchain.lastBlock().header.appStateHash.equals(Hash.fromData('state: 0'))).toBeTruthy()
    })
    it('execute last block transactions', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      // construct block include transactions
      validator.executeLastBlockTransactions() // no txs in genesis
      validator.dapp.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
      validator.dapp.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
      validator.constructBlock()
      expect(validator.dapp.getAppStateHash().equals(Hash.fromData('state: 0'))).toBeTruthy()
      validator.executeLastBlockTransactions() // two txs executed
      expect(validator.dapp.getAppStateHash().equals(Hash.fromData('state: 2'))).toBeTruthy()
    })
    it('add reach block include transactions', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      const dapp = validator.dapp
      const validator2 = new ValidatorNode(MockDapps, genesis, keyPair) // same signer
      const dapp2 = validator2.dapp
      validator.executeLastBlockTransactions() // no txs in genesis
      validator2.executeLastBlockTransactions() // no txs in genesis
      dapp.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
      dapp.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
      dapp2.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
      dapp2.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
      // construct block include transactions
      validator2.constructBlock()
      const block = validator2.blockchain.lastBlock()

      expect(validator.blockchain.height()).toBe(1)
      expect(Array.from(validator.transactionsInPool()).length).toBe(2)
      validator.addReachedBlock(block)
      expect(validator.blockchain.height()).toBe(2)
      expect(Array.from(validator.transactionsInPool()).length).toBe(0)
      expect(dapp.getAppStateHash().equals(Hash.fromData('state: 0'))).toBeTruthy()
      validator.executeLastBlockTransactions() // two txs executed
      expect(dapp.getAppStateHash().equals(Hash.fromData('state: 2'))).toBeTruthy()
    })
  })
  describe('error case', () => {
    it('cant construct block before execute last block transaction', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      validator.dapp.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
      validator.dapp.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
      expect(() => { validator.constructBlock() }).toThrow('need execute last block transactions')
    })
    it('cant execute block multiple times', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      expect(() => { validator.executeLastBlockTransactions() }).not.toThrow()
      expect(() => { validator.executeLastBlockTransactions() }).toThrow('already executed block')
    })
    it('cant add reach block before execute last block transaction', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      const validator2 = new ValidatorNode(MockDapps, genesis, keyPair)
      validator2.executeLastBlockTransactions()
      validator2.constructBlock()
      const block = validator2.blockchain.lastBlock()

      expect(() => { validator.addReachedBlock(block) }).toThrow('need execute last block transactions')
    })
    it('cant add reached block contain invalid app state', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      const invalidValidator = new ValidatorNode(MockDapps, genesis, keyPair)
      const invalidDapps = validator.dapp
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
