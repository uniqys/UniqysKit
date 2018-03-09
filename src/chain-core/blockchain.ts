import { Hash, Hashable, Signature } from 'cryptography'
import { MerkleTree } from 'structure'
import { UInt64 } from 'bytes'

class Block implements Hashable {
  public readonly hash: Hash

  constructor (
    public readonly header: BlockHeader,
    public readonly data: BlockData
  ) {
    this.hash = header.hash
  }
}
class BlockHeader implements Hashable {
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

class BlockData implements Hashable {
  public readonly hash: Hash

  constructor (
    public readonly lastBlockConsensus: Consensus,
    public readonly transactions: MerkleTree<Transaction>

  ) {
    this.hash = Hash.fromData(Buffer.concat([
      transactions.root.buffer,
      lastBlockConsensus.hash.buffer
    ]))
  }
}

class Consensus implements Hashable {
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
  public readonly hash: Hash

  constructor (
    public readonly data: Hashable,
    public readonly nonce: number,
    public readonly sign: Signature

  ) {
    this.hash = Hash.fromData(Buffer.concat([
      data.hash.buffer,
      UInt64.fromNumber(nonce).buffer,
      sign.buffer
    ]))
  }
}

export class Blockchain {
  public blocks: Block[] = []
  public height: number = 0

  constructor (
    public readonly genesisHash: Hash

  ) {}

  public lastBlockHash (): Hash {
    return this.height === 0 ? this.genesisHash : this.blocks[this.height - 1].hash
  }
}
