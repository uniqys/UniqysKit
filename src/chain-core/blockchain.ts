import { Hash, Hashable, Signature } from 'cryptography'
import { MerkleTree } from 'structure'
import { UInt64 } from 'bytes'

export class Blockchain {
  public readonly blocks: Block[] = []

  constructor (
    public readonly genesisBlock: Block

  ) {
    this.blocks.push(genesisBlock)
  }

  public lastBlockHash (): Hash {
    return this.blocks[this.height() - 1].hash
  }

  public height (): number {
    return this.blocks.length
  }

  public addBlock (block: Block) {
    this.blocks.push(block)
  }
}

export class Block implements Hashable {
  public readonly hash: Hash
  constructor (
    public readonly data: BlockData,
    public readonly header: BlockHeader
  ) {
    this.hash = header.hash
  }
}

export class BlockHeader implements Hashable {
  public readonly hash: Hash

  constructor (
    public readonly height: number,
    public readonly timestamp: number,
    public readonly lastBlockHash: Hash,
    public readonly transactionRoot: Hash,
    public readonly lastBlockConsensusHash: Hash,
    public readonly stateRoot: Hash,
    public readonly lastValidatorSetChanged: number
  ) {
    this.hash = Hash.fromData(Buffer.concat([
      UInt64.fromNumber(height).buffer,
      UInt64.fromNumber(timestamp).buffer,
      lastBlockHash.buffer,
      transactionRoot.buffer,
      lastBlockConsensusHash.buffer,
      stateRoot.buffer,
      UInt64.fromNumber(lastValidatorSetChanged).buffer
    ]))
  }
}

export class BlockData implements Hashable {
  public readonly hash: Hash

  constructor (
    public readonly transactions: MerkleTree<Transaction>,
    public readonly lastBlockConsensus: Consensus

  ) {
    this.hash = Hash.fromData(Buffer.concat([
      transactions.root.buffer,
      lastBlockConsensus.hash.buffer
    ]))
  }
}

export class Consensus implements Hashable {
  public readonly hash: Hash

  constructor (
    public readonly round: number,
    public readonly signatures: MerkleTree<Signature>
  ) {
    this.hash = Hash.fromData(Buffer.concat([
      UInt64.fromNumber(round).buffer,
      signatures.root.buffer
    ]))
  }
}

export class Transaction implements Hashable {
  public readonly buffer: Buffer
  public readonly hash: Hash

  constructor (
    public readonly sign: Signature,
    public readonly nonce: number,
    public readonly data: Buffer

  ) {
    this.buffer = Buffer.concat([
      sign.buffer,
      UInt64.fromNumber(nonce).buffer,
      data
    ])
    this.hash = Hash.fromData(this.buffer)
  }

  public toString (): string {
    return this.buffer.toString('hex')
  }

  public equals (other: Transaction): boolean {
    return this.buffer.equals(other.buffer)
  }
}
