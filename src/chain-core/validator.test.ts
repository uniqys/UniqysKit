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
  it('can start and stop node', () => {
    const validator = new ValidatorNode(MockDapps, genesis, keyPair)
    expect(() => { validator.start() }).not.toThrow()
    expect(validator['immediateId']).toBeDefined()
    expect(() => { validator.stop() }).not.toThrow()
    expect(validator['immediateId']).not.toBeDefined()
    expect(() => { validator.stop() }).not.toThrow()
    expect(validator['immediateId']).not.toBeDefined()
  })
  it('can add transaction', () => {
    const validator = new ValidatorNode(MockDapps, genesis, keyPair)
    const transaction = new TransactionData(1234, new Buffer('The quick brown fox jumps over the lazy dog')).sign(signer)
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    validator.addTransaction(transaction)
    expect(Array.from(validator.transactionsInPool()).length).toBe(1)
    expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
  })
  it('is sent transaction by dapps', () => {
    const validator = new ValidatorNode(MockDapps, genesis, keyPair)
    const transaction = new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer)
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    validator.dapp.sendTransaction(transaction)
    expect(Array.from(validator.transactionsInPool()).length).toBe(1)
    expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
  })
  it('proceed consensus if need', () => {
    const validator = new ValidatorNode(MockDapps, genesis, keyPair)
    validator.dapp.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
    validator.dapp.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
    expect(validator.blockchain.height()).toBe(1)
    expect(Array.from(validator.transactionsInPool()).length).toBe(2)
    validator.proceedConsensusUntilSteady()
    expect(validator.blockchain.height()).toBe(3) // tx block and appState proof block
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    expect(validator.blockchain.blockOf(2).data.transactions.items.length).toBe(2)
    expect(validator.blockchain.blockOf(3).header.appStateHash.equals(Hash.fromData('state: 2'))).toBeTruthy()
  })
  it('add reach block include transactions', () => {
    const validator = new ValidatorNode(MockDapps, genesis, keyPair)
    const dapp = validator.dapp
    const validator2 = new ValidatorNode(MockDapps, genesis, keyPair) // same signer
    const dapp2 = validator2.dapp
    dapp.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
    dapp.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
    dapp2.sendTransaction(new TransactionData(1234, new Buffer('Dapps transaction')).sign(signer))
    dapp2.sendTransaction(new TransactionData(1235, new Buffer('Dapps transaction')).sign(signer))
    // construct block include transactions
    validator2.proceedConsensusUntilSteady()
    const block2 = validator2.blockchain.blockOf(2)

    expect(validator.blockchain.height()).toBe(1)
    expect(Array.from(validator.transactionsInPool()).length).toBe(2)
    validator.addReachedBlock(block2)
    expect(validator.blockchain.height()).toBe(2)
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    expect(dapp.getAppStateHash().equals(Hash.fromData('state: 0'))).toBeTruthy()
    validator.proceedConsensusUntilSteady()
    expect(validator.blockchain.height()).toBe(3) // make proof block by myself
    expect(dapp.getAppStateHash().equals(Hash.fromData('state: 2'))).toBeTruthy()
    const block3 = validator2.blockchain.blockOf(3)
    // already have block
    expect(() => { validator.addReachedBlock(block3) }).not.toThrow()
    expect(validator.blockchain.height()).toBe(3)
  })
  describe('error case', () => {
    it('cant add reached block contain invalid app state', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      const invalidValidator = new ValidatorNode(MockDapps, genesis, keyPair)
      const invalidDapps = validator.dapp
      // hack txCount
      invalidDapps.txCount++
      // construct invalid block
      invalidValidator.proceedConsensusUntilSteady()
      const block = invalidValidator.blockchain.lastBlock()

      validator.proceedConsensusUntilSteady() // valid
      expect(() => { validator.addReachedBlock(block) }).toThrow('invalid block')
    })
  })
  describe('private error case', () => {
    it('cant construct block before execute last block', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      expect(() => { validator['constructBlock']() }).toThrow()
    })
    it('cant execute block when all block executed', () => {
      const validator = new ValidatorNode(MockDapps, genesis, keyPair)
      validator.proceedConsensusUntilSteady()
      expect(() => { validator['executeBlockTransactions']() }).toThrow()
    })
  })
})
