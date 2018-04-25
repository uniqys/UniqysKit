import { Bytes64 } from './bytes'

export class Address {
  constructor (
    public readonly buffer: Buffer
  ) { }

  public static fromPublicKey (publicKey: Bytes64): Address {
    // TODO: something conversion
    return new Address(publicKey.buffer)
  }

  // string representation
  // TODO: checksum? base58?
  public static fromString (addressString: string): Address {
    return new Address(Buffer.from(addressString, 'hex'))
  }
  public toString (): string {
    return this.buffer.toString('hex')
  }

  public equals (other: Address): boolean {
    return this.buffer.equals(other.buffer)
  }
}
