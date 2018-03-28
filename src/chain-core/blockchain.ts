import { Hash, Hashable, Signature, Address, Signer } from '../cryptography'
import { MerkleTree } from '../structure'
import { UInt64 } from '../bytes'

export class Blockchain {
  public readonly blocks: Block[] = []

  constructor (
    public readonly genesisBlock: Block

  ) {
    this.blocks.push(genesisBlock)
  }

  public blockOf (height: number): Block {
    if (!(1 <= height && height <= this.height)) { throw new Error('height out of range') }
    return this.blocks[height - 1]
  }

  public validatorSetOf (height: number): ValidatorSet {
    if (!(1 <= height && height <= (this.height + 1))) { throw new Error('height out of range') }
    // this block validatorSet is last block nextValidatorSet
    return this.blockOf(Math.max(height - 1, 1)).data.nextValidatorSet
  }

  public get lastBlock (): Block {
    return this.blockOf(this.height)
  }

  public get lastValidatorSet (): ValidatorSet {
    return this.validatorSetOf(this.height)
  }

  public get height (): number {
    return this.blocks.length
  }

  public addBlock (block: Block) {
    this.blocks.push(block)
  }

  public validateNewBlock (block: Block) {
    const lastBlock = this.lastBlock
    const lastValidatorSet = this.lastValidatorSet
    if (!(block.header.height === lastBlock.header.height + 1)) { throw new Error('invalid block height') }
    if (!(block.header.timestamp >= lastBlock.header.timestamp)) { throw new Error('invalid block timestamp') }
    if (!(block.header.lastBlockHash.equals(lastBlock.hash))) { throw new Error('invalid lastBlockHash') }
    // validate data
    block.validate()
    // verify consensus
    block.data.lastBlockConsensus.validate(lastBlock.hash, lastValidatorSet)
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

  public validate () {
    if (this.header.transactionRoot !== this.data.transactions.root) { throw new Error('invalid transactionRoot') }
    if (this.header.lastBlockConsensusHash !== this.data.lastBlockConsensus.hash) { throw new Error('invalid lastBlockConsensusHash') }
    if (this.header.nextValidatorSetRoot !== this.data.nextValidatorSet.root) { throw new Error('invalid nextValidatorSetRoot') }
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
    public readonly nextValidatorSetRoot: Hash,
    public readonly appStateHash: Hash
  ) {
    this.hash = Hash.fromData(Buffer.concat([
      UInt64.fromNumber(height).buffer,
      UInt64.fromNumber(timestamp).buffer,
      lastBlockHash.buffer,
      transactionRoot.buffer,
      lastBlockConsensusHash.buffer,
      nextValidatorSetRoot.buffer,
      appStateHash.buffer
    ]))
  }
}

export class BlockData {
  constructor (
    public readonly transactions: MerkleTree<Transaction>,
    public readonly lastBlockConsensus: Consensus,
    public readonly nextValidatorSet: ValidatorSet
  ) { }
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

  public validate (messageHash: Hash, validatorSet: ValidatorSet) {
    let power = 0
    for (const sign of this.signatures) {
      const address = Address.fromPublicKey(sign.recover(messageHash))
      if (!validatorSet.exists(address)) { throw new Error('not exists in validator set') }
      power += validatorSet.powerOf(address)
    }
    if (!(power * 3 >= validatorSet.allPower * 2)) { throw new Error('signatures power less than 2/3 validator set power') }
  }
}

export class Transaction implements Hashable {
  public readonly buffer: Buffer
  public readonly hash: Hash

  constructor (
    public readonly sign: Signature,

    public readonly data: TransactionData

  ) {
    this.buffer = Buffer.concat([
      sign.buffer,
      data.buffer
    ])
    this.hash = Hash.fromData(this.buffer)
  }

  public toString (): string {
    return this.buffer.toString('hex')
  }

  public equals (other: Transaction): boolean {
    return this.buffer.equals(other.buffer)
  }

  get signer (): Address {
    return Address.fromPublicKey(this.sign.recover(this.data.hash))
  }
}

export class TransactionData implements Hashable {
  public readonly buffer: Buffer
  public readonly hash: Hash
  constructor (
    public readonly nonce: number,
    public readonly data: Buffer

  ) {
    this.buffer = Buffer.concat([
      UInt64.fromNumber(nonce).buffer,
      data
    ])
    this.hash = Hash.fromData(this.buffer)
  }

  public sign (signer: Signer): Transaction {
    return new Transaction(
      signer.sign(this.hash),
      this
    )
  }
}

export class Validator implements Hashable {
  public readonly hash: Hash
  constructor (
    public readonly address: Address,
    public readonly power: number
  ) {
    this.hash = Hash.fromData(Buffer.concat([
      address.buffer,
      UInt64.fromNumber(power).buffer
    ]))
  }
}

export class ValidatorSet extends MerkleTree<Validator> {
  public readonly allPower: number
  private readonly power: Map<string, number>
  constructor (
    validators: Validator[]
  ) {
    super(validators)
    this.power = new Map(validators.map<[string, number]>(v => [v.address.toString(), v.power]))
    let sum = 0
    for (const v of validators) { sum += v.power }
    this.allPower = sum
  }

  public exists (address: Address) {
    return this.power.get(address.toString()) !== undefined
  }

  public powerOf (address: Address) {
    return this.power.get(address.toString())!
  }
}
