import { Transaction, Block, BlockHeader, BlockData, Consensus, Blockchain } from 'chain-core/blockchain'
import { Signature, Hash } from 'cryptography'
import { Bytes32 } from 'bytes'
import { MerkleTree } from 'structure'

/* tslint:disable:no-unused-expression */
describe('transaction', () => {
  it('can create', () => {
    const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
    expect(new Transaction(sign, 1234, new Buffer(32))).toBeDefined()
  })
  it('can set to map', () => {
    const sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
    const transaction = new Transaction(sign, 1234, new Buffer('The quick brown fox jumps over the lazy dog'))
    const map = new Map<string, Transaction>()
    map.set(transaction.toString(), transaction)
    const sameTransaction = new Transaction(sign, 1234, new Buffer('The quick brown fox jumps over the lazy dog'))
    expect(map.get(sameTransaction.toString())!.equals(sameTransaction)).toBeTruthy()
  })
})

describe('block', () => {
  it('can create', () => {
    const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])))
    const lastBlockHash = new Hash((b => { b.write('foo'); return b })(new Buffer(32)))
    const state = new MerkleTree([])
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, state.root, 0)
    expect(() => { new Block(data, header) }).not.toThrow()
  })
})

describe('blockchain', () => {
  it('can create', () => {
    const genesisBlockHash = new Hash((b => { b.write('foo'); return b })(new Buffer(32)))
    const genesisBlock = { hash: genesisBlockHash } as Block
    expect(() => { new Blockchain(genesisBlock) }).not.toThrow()
  })
  it('can add block', () => {
    const genesisBlockHash = new Hash((b => { b.write('foo'); return b })(new Buffer(32)))
    const genesisBlock = { hash: genesisBlockHash } as Block
    const blockchain = new Blockchain(genesisBlock)
    expect(blockchain.height()).toBe(1)
    expect(blockchain.lastBlockHash().equals(genesisBlockHash)).toBeTruthy()
    const dummyBlockHash = new Hash((b => { b.write('bar'); return b })(new Buffer(32)))
    const dummyBlock = { hash: dummyBlockHash } as Block
    blockchain.addBlock(dummyBlock)
    expect(blockchain.height()).toBe(2)
    expect(blockchain.lastBlockHash().equals(dummyBlockHash)).toBeTruthy()
  })
})
