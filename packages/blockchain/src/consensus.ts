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
  public readonly totalPower: number
  private readonly power: Map<string, number>
  constructor (
    public readonly validators: Validator[]
  ) {
    this.power = new Map(validators.map<[string, number]>(v => [v.address.toString(), v.power]))
    let sum = 0
    for (const v of validators) { sum += v.power }
    this.totalPower = sum
  }
  // naive round robin
  // TODO: implements WEIGHTED round robin
  // istanbul ignore next: TODO
  public proposer (height: number, round: number): Address {
    return this.validators[(height + round) % this.validators.length].address
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
    const power = this.power.get(address.toString())
    if (!power) { throw new Error('not included in the validator set') }
    return power
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
    proposal: (proposal: ConsensusMessage.ProposalMessage) => T,
    prevote: (preVote: ConsensusMessage.PrevoteMessage) => T,
    precommit: (preCommit: ConsensusMessage.PrecommitMessage) => T
  ): T
  public abstract signerAddress (genesis: Hash): Address
  public isProposal (): this is ConsensusMessage.ProposalMessage { return this.match(_ => true, _ => false, _ => false) }
  public isPreVote (): this is ConsensusMessage.PrevoteMessage { return this.match(_ => false, _ => true, _ => false) }
  public isPreCommit (): this is ConsensusMessage.PrecommitMessage { return this.match(_ => false, _ => false, _ => true) }
  public serialize (writer: BufferWriter): void {
    return ConsensusMessage.serialize(this, writer)
  }
}

export enum MessageType { Proposal = 0, Prevote = 1, Precommit = 2 }
export namespace ConsensusMessage {
  export class ProposalMessage extends ConsensusMessage {
    public readonly type: MessageType.Proposal = MessageType.Proposal
    constructor (
      public readonly proposal: Proposal,
      public readonly sign: Signature
    ) { super() }
    public match<T> (
      proposal: (proposal: ProposalMessage) => T,
      _prevote: (preVote: PrevoteMessage) => T,
      _precommit: (preCommit: PrecommitMessage) => T
    ): T { return proposal(this) }
    public signerAddress (genesis: Hash): Address { return this.sign.address(ProposalMessage.digest(this.proposal, genesis)) }
    public static digest (proposal: Proposal, genesis: Hash): Hash {
      const writer = new BufferWriter()
      genesis.serialize(writer)
      UInt8.serialize(MessageType.Proposal, writer)
      proposal.serialize(writer)
      return Hash.fromData(writer.buffer)
    }
  }
  export class PrevoteMessage extends ConsensusMessage {
    public readonly type: MessageType.Prevote = MessageType.Prevote
    constructor (
      public readonly vote: Vote,
      public readonly sign: Signature
    ) { super() }
    public match<T> (
      _proposal: (proposal: ProposalMessage) => T,
      prevote: (preVote: PrevoteMessage) => T,
      _precommit: (preCommit: PrecommitMessage) => T
    ): T { return prevote(this) }
    public signerAddress (genesis: Hash): Address { return this.sign.address(PrevoteMessage.digest(this.vote, genesis)) }
    public static digest (vote: Vote, genesis: Hash): Hash {
      const writer = new BufferWriter()
      genesis.serialize(writer)
      UInt8.serialize(MessageType.Prevote, writer)
      vote.serialize(writer)
      return Hash.fromData(writer.buffer)
    }
  }
  export class PrecommitMessage extends ConsensusMessage {
    public readonly type: MessageType.Precommit = MessageType.Precommit
    constructor (
      public readonly vote: Vote,
      public readonly sign: Signature
    ) { super() }
    public match<T> (
      _proposal: (proposal: ProposalMessage) => T,
      _prevote: (preVote: PrevoteMessage) => T,
      precommit: (preCommit: PrecommitMessage) => T
    ): T { return precommit(this) }
    public signerAddress (genesis: Hash): Address { return this.sign.address(PrecommitMessage.digest(this.vote, genesis)) }
    public static digest (vote: Vote, genesis: Hash): Hash {
      const writer = new BufferWriter()
      genesis.serialize(writer)
      UInt8.serialize(MessageType.Precommit, writer)
      vote.serialize(writer)
      return Hash.fromData(writer.buffer)
    }
  }

  export function proposal (proposal: Proposal, genesis: Hash, signer: Signer): ProposalMessage {
    return new ProposalMessage(proposal, signer.sign(ProposalMessage.digest(proposal, genesis)))
  }
  export function prevote (vote: Vote, genesis: Hash, signer: Signer): PrevoteMessage {
    return new PrevoteMessage(vote, signer.sign(PrevoteMessage.digest(vote, genesis)))
  }
  export function precommit (vote: Vote, genesis: Hash, signer: Signer): PrecommitMessage {
    return new PrecommitMessage(vote, signer.sign(PrecommitMessage.digest(vote, genesis)))
  }
  export const serialize: Serializer<ConsensusMessage> = (message, writer) => message.match(
    proposal => {
      UInt8.serialize(MessageType.Proposal, writer)
      proposal.proposal.serialize(writer)
      proposal.sign.serialize(writer)
    },
    prevote => {
      UInt8.serialize(MessageType.Prevote, writer)
      prevote.vote.serialize(writer)
      prevote.sign.serialize(writer)
    },
    precommit => {
      UInt8.serialize(MessageType.Precommit, writer)
      precommit.vote.serialize(writer)
      precommit.sign.serialize(writer)
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
      case MessageType.Prevote: {
        const vote = Vote.deserialize(reader)
        const sign = Signature.deserialize(reader)
        return new PrevoteMessage(vote, sign)
      }
      case MessageType.Precommit: {
        const vote = Vote.deserialize(reader)
        const sign = Signature.deserialize(reader)
        return new PrecommitMessage(vote, sign)
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
      const address = new ConsensusMessage.PrecommitMessage(this.vote, sign).signerAddress(genesisHash)
      if (!validatorSet.exists(address)) { throw new Error('not exists in validator set') }
      power += validatorSet.powerOf(address)
    }
    if (!(power * 3 > validatorSet.totalPower * 2)) { throw new Error('signatures power is not greater than 2/3 validator set power') }
  }
}
