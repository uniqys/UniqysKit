import { ValidatorNode, Node } from './validator'
import { BlockData, Consensus, BlockHeader, Block, Transaction, ValidatorSet, Validator, TransactionData } from '../structure/blockchain'
import { MerkleTree } from '../structure/merkle-tree'
import { Hash, Signature, KeyPair, Signer } from '../structure/cryptography'
import { Dapp, AppState } from '../interface/dapi'

// mock
class MockDapp implements Dapp {
  public txCount = 0
  public height = 0

  get appState (): AppState {
    return new AppState(this.height, Hash.fromData(`state: ${this.txCount}`))
  }

  connect (): Promise<AppState> {
    return Promise.resolve(this.appState)
  }

  async execute (transactions: Transaction[]): Promise<AppState> {
    for (const _ of transactions) {
      this.txCount++
    }
    this.height++
    return this.appState
  }
}

class MockNode extends Node {
  protected mainLoop (): Promise<void> {
    return Promise.resolve()
  }
}
class MockRejectionNode extends Node {
  protected mainLoop (): Promise<void> {
    return Promise.reject(':(')
  }
}

describe('node', () => {
  it('can start and stop node', (done) => {
    const node = new MockNode()
    expect(() => { node.start() }).not.toThrow()
    node.on('end', done)
    process.nextTick(() => {
      expect(node['immediateId']).toBeDefined()
      expect(() => { node.stop() }).not.toThrow()
      expect(node['immediateId']).not.toBeDefined()
      expect(() => { node.stop() }).not.toThrow()
    })
  })
  it('can start and stop node', (done) => {
    const node = new MockRejectionNode()
    const handler = jest.fn()
    node.start()
    node.on('error', handler)
    node.on('end', () => {
      expect(handler).toBeCalled()
      done()
    })
  })
})

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
    signer = { sign: (_: Hash) => { return new Signature(Buffer.alloc(33)) } }
  })
  it('can create', () => {
    expect(() => { new ValidatorNode(new MockDapp(), genesis) }).not.toThrow()
  })
  it('can do mainLoop', async () => {
    const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
    // do 10 times
    for (let i = 0; i < 10; i++) {
      await expect(validator['mainLoop']()).resolves.not.toThrow()
    }
  })
  it('can add transaction', () => {
    const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
    const transaction = new TransactionData(1234, Buffer.from('The quick brown fox jumps over the lazy dog')).sign(signer)
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    validator.addTransaction(transaction)
    expect(Array.from(validator.transactionsInPool()).length).toBe(1)
    expect(validator.transactionsInPool()[Symbol.iterator]().next().value.equals(transaction)).toBeTruthy()
  })
  it('proceed consensus if need', async () => {
    const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
    validator.addTransaction(new TransactionData(1234, Buffer.from('Dapps transaction')).sign(signer))
    validator.addTransaction(new TransactionData(1235, Buffer.from('Dapps transaction')).sign(signer))
    expect(validator.blockchain.height).toBe(1)
    expect(Array.from(validator.transactionsInPool()).length).toBe(2)
    await validator.proceedConsensusUntilSteady()
    expect(validator.blockchain.height).toBe(3) // tx block and appState proof block
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    expect(validator.blockchain.blockOf(2).data.transactions.items.length).toBe(2)
    expect(validator.blockchain.blockOf(3).header.appStateHash.equals(Hash.fromData('state: 2'))).toBeTruthy()
  })
  it('add reach block include transactions', async () => {
    const dapp = new MockDapp()
    const validator = new ValidatorNode(dapp, genesis, keyPair)
    const dapp2 = new MockDapp()
    const validator2 = new ValidatorNode(dapp2, genesis, keyPair) // same signer
    validator.addTransaction(new TransactionData(1234, Buffer.from('Dapps transaction')).sign(signer))
    validator.addTransaction(new TransactionData(1235, Buffer.from('Dapps transaction')).sign(signer))
    validator2.addTransaction(new TransactionData(1234, Buffer.from('Dapps transaction')).sign(signer))
    validator2.addTransaction(new TransactionData(1235, Buffer.from('Dapps transaction')).sign(signer))
    // construct block include transactions
    await validator2.proceedConsensusUntilSteady()
    const block2 = validator2.blockchain.blockOf(2)

    expect(validator.blockchain.height).toBe(1)
    expect(Array.from(validator.transactionsInPool()).length).toBe(2)
    await validator.addReachedBlock(block2)
    // allow reach already have block
    await expect(validator.addReachedBlock(block2)).resolves.not.toThrow()
    expect(validator.blockchain.height).toBe(2)
    expect(Array.from(validator.transactionsInPool()).length).toBe(0)
    expect(dapp.appState.hash.equals(Hash.fromData('state: 0'))).toBeTruthy()
    await validator.proceedConsensusUntilSteady()
    expect(validator.blockchain.height).toBe(3) // make proof block by myself
    expect(dapp.appState.hash.equals(Hash.fromData('state: 2'))).toBeTruthy()
  })
  describe('error case', () => {
    it('cant add reached block contain invalid app state', async () => {
      const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
      const invalidDapp = new MockDapp()
      const invalidValidator = new ValidatorNode(invalidDapp, genesis, keyPair)
      // hack txCount
      invalidDapp.txCount++
      // construct invalid block
      await invalidValidator.proceedConsensusUntilSteady()
      const block = invalidValidator.blockchain.lastBlock

      await validator.proceedConsensusUntilSteady() // valid
      await expect(validator.addReachedBlock(block)).rejects.toThrow('invalid block')
    })
  })
  describe('private error case', () => {
    it('cant proceed consensus before initialize', async () => {
      const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
      await expect(validator['proceedConsensus']()).rejects.toThrow('not initialized')
    })
    it('cant construct block before initialize', () => {
      const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
      expect(() => { validator['constructBlock']() }).toThrow('not initialized')
    })
    it('cant construct block before execute last block', async () => {
      const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
      await validator['initialize']()
      expect(() => { validator['constructBlock']() }).toThrow()
    })
    it('cant execute block before initialize', async () => {
      const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
      await expect(validator['executeBlockTransactions']()).rejects.toThrow('not initialized')
    })
    it('cant execute block when all block executed', async () => {
      const validator = new ValidatorNode(new MockDapp(), genesis, keyPair)
      await validator.proceedConsensusUntilSteady()
      await expect(validator['executeBlockTransactions']()).rejects.toThrow()
    })
    it('throw error if connected app block height over known it', async () => {
      const invalidDapp = new MockDapp()
      const invalidValidator = new ValidatorNode(invalidDapp, genesis, keyPair)
      // hack height
      invalidDapp.height = 10
      await expect(invalidValidator['initialize']()).rejects.toThrow('need reset app')
    })
    it('throw error if executed app block height is wrong', async () => {
      const invalidDapp = new MockDapp()
      const invalidValidator = new ValidatorNode(invalidDapp, genesis, keyPair)
      await invalidValidator['initialize']()
      // hack height
      invalidDapp.height++
      await expect(invalidValidator['executeBlockTransactions']()).rejects.toThrow('block height mismatch')
    })
  })
})
