import { Address, Hash, Hashable, Signature, Signer } from '@uniqys/signature'
import { MerkleTree } from './merkle-tree'
import { Serializable, UInt64, BufferWriter, BufferReader, List, serialize, UInt8, UInt32, Serializer, Deserializer } from '@uniqys/serialize'
import { Block } from './block'

export class Validator implements Hashable, Serializable {
  public get hash (): Hash {
    return Hash.fromData(serialize(this))
  }
  constructor (
    public readonly address: Address,
    public readonly power: number
  ) {
  }
  public static deserialize (reader: BufferReader): Validator {
    const address = Address.deserialize(reader)
    const power = UInt64.deserialize(reader)
    return new Validator(address, power)
  }
  public serialize (writer: BufferWriter) {
    this.address.serialize(writer)
    UInt64.serialize(this.power, writer)
  }
}

export class ValidatorSet implements Hashable, Serializable {
  public get hash () { return MerkleTree.root(this.validators) }
  public readonly allPower: number
  private readonly power: Map<string, number>
  constructor (
    public readonly validators: Validator[]
  ) {
    this.power = new Map(validators.map<[string, number]>(v => [v.address.toString(), v.power]))
    let sum = 0
    for (const v of validators) { sum += v.power }
    this.allPower = sum
  }
  public static deserialize (reader: BufferReader): ValidatorSet {
    return new ValidatorSet(List.deserialize(Validator.deserialize)(reader))
  }
  public serialize (writer: BufferWriter) {
    List.serialize<Validator>((v, w) => v.serialize(w))(this.validators, writer)
  }

  public exists (address: Address) {
    return this.power.get(address.toString()) !== undefined
  }

  public powerOf (address: Address) {
    return this.power.get(address.toString())!
  }
}

export class Proposal implements Serializable {
  constructor (
    public readonly height: number,
    public readonly round: number, // start 1
    public readonly lockedRound: number, // 0 is nil
    public readonly block: Block
  ) {}
  public static deserialize (reader: BufferReader): Proposal {
    const height = UInt64.deserialize(reader)
    const round = UInt32.deserialize(reader)
    const lockedRound = UInt32.deserialize(reader)
    const block = Block.deserialize(reader)
    return new Proposal(height, round, lockedRound, block)
  }
  public serialize (writer: BufferWriter) {
    UInt64.serialize(this.height, writer)
    UInt32.serialize(this.round, writer)
    UInt32.serialize(this.lockedRound, writer)
    this.block.serialize(writer)
  }
}
export class Vote implements Serializable {
  constructor (
    public readonly height: number,
    public readonly round: number,
    public readonly blockHash: Hash
  ) {}
  public static deserialize (reader: BufferReader): Vote {
    const height = UInt64.deserialize(reader)
    const round = UInt32.deserialize(reader)
    const blockHash = Hash.deserialize(reader)
    return new Vote(height, round, blockHash)
  }
  public serialize (writer: BufferWriter) {
    UInt64.serialize(this.height, writer)
    UInt32.serialize(this.round, writer)
    this.blockHash.serialize(writer)
  }
}

export abstract class ConsensusMessage implements Serializable {
  public abstract match<T> (
    proposal: (p: Proposal, sign: Signature) => T,
    preVote: (v: Vote, sign: Signature) => T,
    preCommit: (v: Vote, sign: Signature) => T
  ): T
  public abstract signerAddress (genesis: Hash): Address
  public isProposal (): this is ConsensusMessage.ProposalMessage { return this.match(_ => true, _ => false, _ => false) }
  public isPreVote (): this is ConsensusMessage.PreVoteMessage { return this.match(_ => false, _ => true, _ => false) }
  public isPreCommit (): this is ConsensusMessage.PreCommitMessage { return this.match(_ => false, _ => false, _ => true) }
  public serialize (writer: BufferWriter): void {
    return ConsensusMessage.serialize(this, writer)
  }
}

enum MessageType { Proposal, PreVote, PreCommit }
export namespace ConsensusMessage {
  export class ProposalMessage extends ConsensusMessage {
    constructor (
      public readonly proposal: Proposal,
      public readonly sign: Signature
    ) { super() }
    public match<T> (
      proposal: (p: Proposal, sign: Signature) => T,
      _preVote: (v: Vote, sign: Signature) => T,
      _preCommit: (v: Vote, sign: Signature) => T
    ): T { return proposal(this.proposal, this.sign) }
    public signerAddress (genesis: Hash): Address { return this.sign.address(ProposalMessage.digest(this.proposal, genesis)) }
    public static digest (proposal: Proposal, genesis: Hash): Hash {
      const writer = new BufferWriter()
      genesis.serialize(writer)
      UInt8.serialize(MessageType.Proposal, writer)
      proposal.serialize(writer)
      return Hash.fromData(writer.buffer)
    }
  }
  export class PreVoteMessage extends ConsensusMessage {
    constructor (
      public readonly vote: Vote,
      public readonly sign: Signature
    ) { super() }
    public match<T> (
      _proposal: (p: Proposal, sign: Signature) => T,
      preVote: (v: Vote, sign: Signature) => T,
      _preCommit: (v: Vote, sign: Signature) => T
    ): T { return preVote(this.vote, this.sign) }
    public signerAddress (genesis: Hash): Address { return this.sign.address(PreVoteMessage.digest(this.vote, genesis)) }
    public static digest (vote: Vote, genesis: Hash): Hash {
      const writer = new BufferWriter()
      genesis.serialize(writer)
      UInt8.serialize(MessageType.PreVote, writer)
      vote.serialize(writer)
      return Hash.fromData(writer.buffer)
    }
  }
  export class PreCommitMessage extends ConsensusMessage {
    constructor (
      public readonly vote: Vote,
      public readonly sign: Signature
    ) { super() }
    public match<T> (
      _proposal: (p: Proposal, sign: Signature) => T,
      _preVote: (v: Vote, sign: Signature) => T,
      preCommit: (v: Vote, sign: Signature) => T
    ): T { return preCommit(this.vote, this.sign) }
    public signerAddress (genesis: Hash): Address { return this.sign.address(PreCommitMessage.digest(this.vote, genesis)) }
    public static digest (vote: Vote, genesis: Hash): Hash {
      const writer = new BufferWriter()
      genesis.serialize(writer)
      UInt8.serialize(MessageType.PreCommit, writer)
      vote.serialize(writer)
      return Hash.fromData(writer.buffer)
    }
  }

  export function proposal (proposal: Proposal, genesis: Hash, signer: Signer): ConsensusMessage {
    return new ProposalMessage(proposal, signer.sign(ProposalMessage.digest(proposal, genesis)))
  }
  export function preVote (vote: Vote, genesis: Hash, signer: Signer): ConsensusMessage {
    return new PreVoteMessage(vote, signer.sign(PreVoteMessage.digest(vote, genesis)))
  }
  export function preCommit (vote: Vote, genesis: Hash, signer: Signer): ConsensusMessage {
    return new PreCommitMessage(vote, signer.sign(PreCommitMessage.digest(vote, genesis)))
  }
  export const serialize: Serializer<ConsensusMessage> = (message, writer) => message.match(
    (proposal, sign) => {
      UInt8.serialize(MessageType.Proposal, writer)
      proposal.serialize(writer)
      sign.serialize(writer)
    },
    (preVote, sign) => {
      UInt8.serialize(MessageType.PreVote, writer)
      preVote.serialize(writer)
      sign.serialize(writer)
    },
    (preCommit, sign) => {
      UInt8.serialize(MessageType.PreCommit, writer)
      preCommit.serialize(writer)
      sign.serialize(writer)
    }
  )
  export const deserialize: Deserializer<ConsensusMessage> = (reader) => {
    const label = UInt8.deserialize(reader)
    switch (label) {
      case MessageType.Proposal: {
        const proposal = Proposal.deserialize(reader)
        const sign = Signature.deserialize(reader)
        return new ProposalMessage(proposal, sign)
      }
      case MessageType.PreVote: {
        const vote = Vote.deserialize(reader)
        const sign = Signature.deserialize(reader)
        return new PreVoteMessage(vote, sign)
      }
      case MessageType.PreCommit: {
        const vote = Vote.deserialize(reader)
        const sign = Signature.deserialize(reader)
        return new PreCommitMessage(vote, sign)
      }
      default: throw new Error()
    }
  }
}

export class Consensus implements Hashable, Serializable {
  public get hash () {
    return Hash.fromData(Buffer.concat([
      Hash.fromData(serialize(this.vote)).buffer,
      MerkleTree.root(this.signatures).buffer
    ]))
  }
  constructor (
    public readonly vote: Vote,
    public readonly signatures: Signature[]
  ) { }
  public serialize (writer: BufferWriter) {
    this.vote.serialize(writer)
    List.serialize<Signature>((s, w) => s.serialize(w))(this.signatures, writer)
  }
  public static deserialize (reader: BufferReader): Consensus {
    const vote = Vote.deserialize(reader)
    const signs = List.deserialize(Signature.deserialize)(reader)
    return new Consensus(vote, signs)
  }

  public validate (blockHash: Hash, genesisHash: Hash, validatorSet: ValidatorSet) {
    if (!this.vote.blockHash.equals(blockHash)) { throw new Error('block hash mismatch') }
    let power = 0
    for (const sign of this.signatures) {
      const address = new ConsensusMessage.PreCommitMessage(this.vote, sign).signerAddress(genesisHash)
      if (!validatorSet.exists(address)) { throw new Error('not exists in validator set') }
      power += validatorSet.powerOf(address)
    }
    if (!(power * 3 > validatorSet.allPower * 2)) { throw new Error('signatures power is not greater than 2/3 validator set power') }
  }
}
