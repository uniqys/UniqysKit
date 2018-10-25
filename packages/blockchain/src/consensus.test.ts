import { Consensus, ValidatorSet, Validator, Vote, ConsensusMessage, Proposal } from './consensus'
import { Hash, KeyPair } from '@uniqys/signature'
import { Bytes32 } from '@uniqys/types'
import { serialize, deserialize } from '@uniqys/serialize'
import { Block } from './block'
import { TransactionList } from './transaction'

/* tslint:disable:no-unused-expression */
describe('validator set', () => {
  let signer1: KeyPair
  let signer2: KeyPair
  let signer3: KeyPair
  let validatorSet: ValidatorSet
  beforeAll(() => {
    signer1 = new KeyPair()
    signer2 = new KeyPair()
    signer3 = new KeyPair()
    validatorSet = new ValidatorSet([
      new Validator(signer1.address, 10),
      new Validator(signer2.address, 19)
    ])
  })
  it('contain validators', () => {
    expect(validatorSet.validators.length).toBe(2)
  })
  it('has all power of validators', () => {
    expect(validatorSet.totalPower).toBe(29)
  })
  it('can get power of validators', () => {
    expect(validatorSet.powerOf(signer1.address)).toBe(10)
    expect(validatorSet.powerOf(signer2.address)).toBe(19)
    expect(() => { validatorSet.powerOf(signer3.address) }).toThrow()
  })
  it('is serializable', () => {
    expect(deserialize(serialize(validatorSet), ValidatorSet.deserialize).hash.equals(validatorSet.hash)).toBeTruthy()
  })
})

describe('consensus message', () => {
  let block: Block
  let genesisHash: Hash
  let signer: KeyPair
  beforeAll(() => {
    const height = 42
    const epoch = 1520825696
    const lastBlockHash = Hash.fromData('foo')
    const state = Hash.fromData('bar')
    const validatorSet = Hash.fromData('buzz')
    const transactions = new TransactionList([])
    const consensus = new Consensus(new Vote(41, 1, Hash.fromData('foo')), [])
    block = Block.construct(height, epoch, lastBlockHash, state, validatorSet, transactions, consensus)
    genesisHash = Hash.fromData('genesis')
    signer = new KeyPair()
  })
  it('destruct with match', () => {
    const proposal = ConsensusMessage.proposal(new Proposal(1, 1, 0, block), genesisHash, signer)
    const preVote = ConsensusMessage.prevote(new Vote(1, 1, block.hash), genesisHash, signer)
    const preCommit = ConsensusMessage.precommit(new Vote(1, 2, block.hash), genesisHash, signer)
    expect(proposal.match(p => p , _ => null, _ => null)).toEqual(proposal)
    expect(preVote.match(_ => null , v => v, _ => null)).toEqual(preVote)
    expect(preCommit.match(_ => null , _ => null, v => v)).toEqual(preCommit)
  })
  it('can check what is it', () => {
    const proposal = ConsensusMessage.proposal(new Proposal(1, 1, 0, block), genesisHash, signer)
    const preVote = ConsensusMessage.prevote(new Vote(1, 1, block.hash), genesisHash, signer)
    const preCommit = ConsensusMessage.precommit(new Vote(1, 2, block.hash), genesisHash, signer)
    expect(proposal.isProposal()).toBeTruthy()
    expect(proposal.isPreVote()).not.toBeTruthy()
    expect(proposal.isPreCommit()).not.toBeTruthy()
    expect(preVote.isProposal()).not.toBeTruthy()
    expect(preVote.isPreVote()).toBeTruthy()
    expect(preVote.isPreCommit()).not.toBeTruthy()
    expect(preCommit.isProposal()).not.toBeTruthy()
    expect(preCommit.isPreVote()).not.toBeTruthy()
    expect(preCommit.isPreCommit()).toBeTruthy()
  })
  it('recover signer address', () => {
    const proposal = ConsensusMessage.proposal(new Proposal(1, 1, 0, block), genesisHash, signer)
    const preVote = ConsensusMessage.prevote(new Vote(1, 1, block.hash), genesisHash, signer)
    const preCommit = ConsensusMessage.precommit(new Vote(1, 2, block.hash), genesisHash, signer)
    expect(proposal.signerAddress(genesisHash)).toEqual(signer.address)
    expect(preVote.signerAddress(genesisHash)).toEqual(signer.address)
    expect(preCommit.signerAddress(genesisHash)).toEqual(signer.address)
  })
  it('serialize and deserialize', () => {
    const proposal = ConsensusMessage.proposal(new Proposal(1, 1, 0, block), genesisHash, signer)
    const preVote = ConsensusMessage.prevote(new Vote(1, 1, block.hash), genesisHash, signer)
    const preCommit = ConsensusMessage.precommit(new Vote(1, 1, block.hash), genesisHash, signer)
    expect(deserialize(serialize(proposal), ConsensusMessage.deserialize)).toEqual(proposal)
    expect(deserialize(serialize(preVote), ConsensusMessage.deserialize)).toEqual(preVote)
    expect(deserialize(serialize(preCommit), ConsensusMessage.deserialize)).toEqual(preCommit)
  })
})

describe('consensus', () => {
  let blockHash: Hash
  let genesisHash: Hash
  let vote: Vote
  let digest: Hash
  let signer1: KeyPair
  let signer2: KeyPair
  let signer3: KeyPair
  let validatorSet: ValidatorSet
  beforeAll(() => {
    blockHash = Hash.fromData('foo')
    genesisHash = Hash.fromData('bar')
    vote = new Vote(1, 1, blockHash)
    digest = ConsensusMessage.PrecommitMessage.digest(vote, genesisHash)
    signer1 = new KeyPair()
    signer2 = new KeyPair()
    signer3 = new KeyPair()
    validatorSet = new ValidatorSet([
      new Validator(signer1.address, 9),
      new Validator(signer2.address, 20),
      new Validator(signer3.address, 1)
    ])
  })
  it('validate if it has greater than 2/3 power signature', () => {
    const consensus = new Consensus(vote, [signer2.sign(digest), signer3.sign(digest)]) // +2/3
    expect(() => { consensus.validate(blockHash, genesisHash, validatorSet) }).not.toThrow()
  })
  it('can not validate if it has not greater than 2/3 power signature', () => {
    const consensus = new Consensus(vote, [signer2.sign(digest)]) // == 2/3
    expect(() => { consensus.validate(blockHash, genesisHash, validatorSet) }).toThrow()
  })
  it('can not validate if it has invalid signature', () => {
    const key = new KeyPair(new Bytes32(Buffer.from('cbfde2698ab8d8d3f2ddfea748d972bcc9cd5b74f3152c13d51d9c576e0a15f5', 'hex')))
    const sign = key.sign(digest)
    sign.signature.buffer.write('modify')
    const consensus = new Consensus(vote, [sign, signer2.sign(digest), signer3.sign(digest)]) // +2/3 valid sign
    expect(() => { consensus.validate(blockHash, genesisHash, validatorSet) }).toThrow()
  })
  it('can not validate if it has unknown signature', () => {
    const signer = new KeyPair()
    const consensus = new Consensus(vote, [signer.sign(digest), signer2.sign(digest), signer3.sign(digest)]) // +2/3 valid sign
    expect(() => { consensus.validate(blockHash, genesisHash, validatorSet) }).toThrow()
  })
  it('can not validate if it has invalid hash', () => {
    const consensus = new Consensus(vote, [signer2.sign(digest), signer3.sign(digest)]) // +2/3 valid sign
    expect(() => { consensus.validate(Hash.fromData('other hash'), genesisHash, validatorSet) }).toThrow()
  })
  it('is serializable', () => {
    const signer = new KeyPair()
    const consensus = new Consensus(vote, [signer.sign(digest), signer2.sign(digest)])
    expect(deserialize(serialize(consensus), Consensus.deserialize).hash.equals(consensus.hash)).toBeTruthy()
  })
})
