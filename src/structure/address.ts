import { Bytes20, Bytes64 } from './bytes'
import { Hash } from './cryptography'
import { BufferReader } from './serializable'

export class Address extends Bytes20 {
  public static zero = new Address(Buffer.alloc(20))
  public static deserialize (reader: BufferReader): Address {
    return new Address(Bytes20.deserialize(reader).buffer)
  }
  public static fromPublicKey (publicKey: Bytes64): Address {
    return new Address(Hash.fromData(publicKey.buffer).buffer.slice(12, 32))
  }

  // string representation
  // TODO: checksum? base58?
  public static fromString (addressString: string): Address {
    return new Address(Buffer.from(addressString, 'hex'))
  }
  public toString (): string {
    return this.buffer.toString('hex')
  }
}
