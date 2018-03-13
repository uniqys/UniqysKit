import { Transaction, Block, BlockHeader, BlockData, Consensus, Blockchain, ValidatorSet, Validator } from 'chain-core/blockchain'
import { Signature, Hash, KeyPair } from 'cryptography'
import { Bytes32 } from 'bytes'
import { MerkleTree } from 'structure'

/* tslint:disable:no-unused-expression */
describe('transaction', () => {
  it('can create', () => {
    const sign = new Signature(new Bytes32(new Buffer(32)), 0)
    expect(new Transaction(sign, 1234, new Buffer(32))).toBeDefined()
  })
  it('can set to map', () => {
    const sign = new Signature(new Bytes32(new Buffer(32)), 0)
    const transaction = new Transaction(sign, 1234, new Buffer('The quick brown fox jumps over the lazy dog'))
    const map = new Map<string, Transaction>()
    map.set(transaction.toString(), transaction)
    const sameTransaction = new Transaction(sign, 1234, new Buffer('The quick brown fox jumps over the lazy dog'))
    expect(map.get(sameTransaction.toString())!.equals(sameTransaction)).toBeTruthy()
  })
})

describe('consensus', () => {
  const hash = Hash.fromData('foo')
  const signer1 = new KeyPair()
  const signer2 = new KeyPair()
  const signer3 = new KeyPair()
  const validatorSet = new ValidatorSet([
    new Validator(signer1.address(), 10),
    new Validator(signer2.address(), 19),
    new Validator(signer3.address(), 1)
  ])
  it('validate if it has more than 2/3 power signature', () => {
    const consensus = new Consensus(0, new MerkleTree([signer2.sign(hash), signer3.sign(hash)])) // 2/3
    expect(() => { consensus.validate(hash, validatorSet) }).not.toThrow()
  })
  it('can not validate if it has less than 2/3 power signature', () => {
    const consensus = new Consensus(0, new MerkleTree([signer2.sign(hash)])) // < 2/3
    expect(() => { consensus.validate(hash, validatorSet) }).toThrow()
  })
  it('can not validate if it has invalid signature', () => {
    const key = new KeyPair(new Bytes32(new Buffer('cbfde2698ab8d8d3f2ddfea748d972bcc9cd5b74f3152c13d51d9c576e0a15f5', 'hex')))
    const sign = key.sign(hash)
    sign.signature.buffer.write('modify')
    const consensus = new Consensus(0, new MerkleTree([sign, signer2.sign(hash), signer3.sign(hash)])) // 2/3 valid sign
    expect(() => { consensus.validate(hash, validatorSet) }).toThrow()
  })
  it('can not validate if it has unknown signature', () => {
    const signer = new KeyPair()
    const consensus = new Consensus(0, new MerkleTree([signer.sign(hash), signer2.sign(hash), signer3.sign(hash)])) // 2/3 valid sign
    expect(() => { consensus.validate(hash, validatorSet) }).toThrow()
  })
})

describe('block', () => {
  it('can create', () => {
    const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), new ValidatorSet([]))
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, state)
    expect(() => { new Block(data, header) }).not.toThrow()
  })
  it('validate on valid block', () => {
    const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), new ValidatorSet([]))
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, state)
    const block = new Block(data, header)
    expect(() => { block.validate() }).not.toThrow()
  })
  it('can not validate on invalid block', () => {
    const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), new ValidatorSet([]))
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
    const invalidHash = Hash.fromData('buzz')
    {
      const header = new BlockHeader(1, epoch, lastBlockHash, invalidHash, data.lastBlockConsensus.hash, data.nextValidatorSet.root, state)
      expect(() => { new Block(data, header).validate() }).toThrow()
    }
    {
      const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, invalidHash, data.nextValidatorSet.root, state)
      expect(() => { new Block(data, header).validate() }).toThrow()
    }
    {
      const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, invalidHash, state)
      expect(() => { new Block(data, header).validate() }).toThrow()
    }
  })
})

describe('blockchain', () => {
  it('can create', () => {
    const genesisBlockHash = Hash.fromData('foo')
    const genesisBlock = { hash: genesisBlockHash } as Block
    expect(() => { new Blockchain(genesisBlock) }).not.toThrow()
  })
  it('can get block of height', () => {
    const genesisBlockHash = Hash.fromData('foo')
    const genesisBlock = { hash: genesisBlockHash } as Block
    const blockchain = new Blockchain(genesisBlock)
    const dummyBlockHash = Hash.fromData('bar')
    const dummyBlock = { hash: dummyBlockHash } as Block
    blockchain.addBlock(dummyBlock)
    expect(blockchain.blockOf(1).hash.equals(genesisBlockHash)).toBeTruthy()
    expect(blockchain.blockOf(2).hash.equals(dummyBlockHash)).toBeTruthy()
    expect(() => { blockchain.blockOf(3) }).toThrow()
  })
  it('can get validator set of height', () => {
    const validatorSet = new ValidatorSet([])
    const genesisData = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), validatorSet)
    const genesisHeader = new BlockHeader(1, 100, Hash.fromData('genesis'),
      genesisData.transactions.root, genesisData.lastBlockConsensus.hash, genesisData.nextValidatorSet.root, Hash.fromData('state'))
    const genesisBlock = new Block(genesisData,genesisHeader)
    const blockchain = new Blockchain(genesisBlock)
    expect(blockchain.validatorSetOf(1).hash.equals(validatorSet.hash)).toBeTruthy()
    expect(blockchain.validatorSetOf(2).hash.equals(validatorSet.hash)).toBeTruthy()
    expect(() => { blockchain.validatorSetOf(3) }).toThrow()
  })
  it('can add block', () => {
    const genesisBlockHash = Hash.fromData('foo')
    const genesisBlock = { hash: genesisBlockHash } as Block
    const blockchain = new Blockchain(genesisBlock)
    expect(blockchain.height()).toBe(1)
    expect(blockchain.lastBlock().hash.equals(genesisBlockHash)).toBeTruthy()
    const dummyBlockHash = Hash.fromData('bar')
    const dummyBlock = { hash: dummyBlockHash } as Block
    blockchain.addBlock(dummyBlock)
    expect(blockchain.height()).toBe(2)
    expect(blockchain.lastBlock().hash.equals(dummyBlockHash)).toBeTruthy()
  })
  describe('validate new block', () => {
    const signer = new KeyPair()
    const validatorSet = new ValidatorSet([ new Validator(signer.address(), 100) ])
    const genesisData = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), validatorSet)
    const genesisHeader = new BlockHeader(1, 100, Hash.fromData('genesis'),
      genesisData.transactions.root, genesisData.lastBlockConsensus.hash, genesisData.nextValidatorSet.root, Hash.fromData('state'))
    const genesisBlock = new Block(genesisData,genesisHeader)
    const blockchain = new Blockchain(genesisBlock)
    it('validate valid new block', () => {
      const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([signer.sign(genesisBlock.hash)])), new ValidatorSet([]))
      const header = new BlockHeader(2, 110, genesisBlock.hash,
        data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, Hash.fromData('state2'))
      const block = new Block(data, header)
      expect(() => { blockchain.validateNewBlock(block) }).not.toThrow()
    })
    it('can not validate invalid block', () => {
      const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([signer.sign(genesisBlock.hash)])), new ValidatorSet([]))
      const header = new BlockHeader(2, 110, genesisBlock.hash,
        Hash.fromData('invalid'), data.lastBlockConsensus.hash, data.nextValidatorSet.root, Hash.fromData('state2'))
      const block = new Block(data, header)
      expect(() => { blockchain.validateNewBlock(block) }).toThrow()
    })
    it('can not validate invalid height', () => {
      const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([signer.sign(genesisBlock.hash)])), new ValidatorSet([]))
      const header = new BlockHeader(3, 110, genesisBlock.hash,
        data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, Hash.fromData('state2'))
      const block = new Block(data, header)
      expect(() => { blockchain.validateNewBlock(block) }).toThrow()
    })
    it('can not validate invalid timestamp', () => {
      const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([signer.sign(genesisBlock.hash)])), new ValidatorSet([]))
      const header = new BlockHeader(2, 90, genesisBlock.hash,
        data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, Hash.fromData('state2'))
      const block = new Block(data, header)
      expect(() => { blockchain.validateNewBlock(block) }).toThrow()
    })
    it('can not validate invalid lastBlockHash', () => {
      const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([signer.sign(genesisBlock.hash)])), new ValidatorSet([]))
      const header = new BlockHeader(2, 110, Hash.fromData('invalid'),
        data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, Hash.fromData('state2'))
      const block = new Block(data, header)
      expect(() => { blockchain.validateNewBlock(block) }).toThrow()
    })
    it('can not validate invalid consensus', () => {
      const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), new ValidatorSet([]))
      const header = new BlockHeader(2, 110, genesisBlock.hash,
        data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, Hash.fromData('state2'))
      const block = new Block(data, header)
      expect(() => { blockchain.validateNewBlock(block) }).toThrow()
    })
  })
})
