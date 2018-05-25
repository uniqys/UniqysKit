
import { Hash, Hashable, Signature, Signer } from '../cryptography'
import { Address } from '../address'
import { MerkleTree } from '../merkle-tree'
import { Serializable, UInt64, BufferWriter, serialize, BufferReader, UInt32, List } from '../serializable'

export class TransactionData implements Hashable, Serializable {
  public get hash () { return Hash.fromData(serialize(this)) }
  constructor (
    public readonly nonce: number,
    public readonly data: Buffer
  ) { }
  public static deserialize (reader: BufferReader): TransactionData {
    const nonce = UInt64.deserialize(reader)
    const data = reader.consume(UInt32.deserialize(reader))
    return new TransactionData(nonce, data)
  }
  public serialize (writer: BufferWriter) {
    UInt64.serialize(this.nonce, writer)
    UInt32.serialize(this.data.byteLength, writer)
    writer.append(this.data)
  }
  public equals (other: TransactionData): boolean {
    return this.nonce === other.nonce && this.data.equals(other.data)
  }
}

export class Transaction implements Hashable, Serializable {
  public readonly hash: Hash
  constructor (
    public readonly sign: Signature,
    public readonly data: TransactionData
  ) {
    this.hash = Hash.fromData(serialize(this))
  }
  public static sign (signer: Signer, data: TransactionData): Transaction {
    return new Transaction(signer.sign(data.hash), data)
  }
  public static deserialize (reader: BufferReader): Transaction {
    const sign = Signature.deserialize(reader)
    const data = TransactionData.deserialize(reader)
    return new Transaction(sign, data)
  }
  public serialize (writer: BufferWriter) {
    this.sign.serialize(writer)
    this.data.serialize(writer)
  }
  public equals (other: Transaction) {
    return this.sign.equals(other.sign) && this.data.equals(other.data)
  }
  get signer (): Address {
    return Address.fromPublicKey(this.sign.recover(this.data.hash))
  }
}

export class TransactionList implements Hashable, Serializable, Iterable<Transaction> {
  public get hash () { return MerkleTree.root(this.transactions) }
  constructor (
    public readonly transactions: Transaction[]
  ) { }
  public static deserialize (reader: BufferReader): TransactionList {
    return new TransactionList(List.deserialize(Transaction.deserialize)(reader))
  }
  public serialize (writer: BufferWriter) {
    List.serialize<Transaction>((t, w) => t.serialize(w))(this.transactions, writer)
  }
  public [Symbol.iterator] (): Iterator<Transaction> {
    return this.transactions[Symbol.iterator]()
  }
}
