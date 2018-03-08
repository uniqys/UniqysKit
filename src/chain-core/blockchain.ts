import { Hash, Signature } from 'cryptography'

class BlockSummary {
  constructor (
    public readonly prevHash: Hash,
    public readonly stateRoot: Hash,
    public readonly hight: number,
    public readonly timestamp: number
  ) {}
}

class BlockConsensus {
  constructor (
    public readonly round: number,
    public readonly signatures: Signature[]
  ) {}
}

class BlockHeader {
  constructor (
    public readonly summary: BlockSummary,
    public readonly consensus: BlockConsensus
  ) {}
}

class Transaction {
  constructor (
    public readonly data: {}

  ) {}
}

export class Block {
  constructor (
    public readonly header: BlockHeader,
    public readonly transactions: Transaction[]

  ) {}
}
