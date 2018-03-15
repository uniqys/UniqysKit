import createKeccakHash from 'keccak'
import secp256k1 from 'secp256k1'
import { Bytes32, Bytes64, UInt8 } from './bytes'
import { randomBytes } from 'crypto'

export class Hash extends Bytes32 {
  public static fromData (data: string | Buffer | DataView) {
    return new Hash(createKeccakHash('keccak256').update(data).digest())
  }
}

export interface Hashable {
  hash: Hash
}

export class Signature implements Hashable {
  public readonly hash: Hash

  constructor (
    public signature: Bytes64,
    public recovery: number
  ) {
    this.hash = Hash.fromData(Buffer.concat([
      signature.buffer,
      UInt8.fromNumber(recovery).buffer
    ]))
  }

  // Ethereum compatible
  public static sign (messageHash: Hash, privateKey: Bytes32) {
    const sig = secp256k1.sign(new Buffer(messageHash.buffer), new Buffer(privateKey.buffer))

    return new Signature(new Bytes64(sig.signature), sig.recovery)
  }

  public recover (messageHash: Hash): Bytes64 {
    try {
      return new Bytes64(secp256k1.recover(messageHash.buffer, this.signature.buffer, this.recovery, false).slice(1))
    } catch (e) {
      throw new Error('couldn\'t recover public key from signature')
    }
  }
}

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
    return new Address(new Buffer(addressString, 'hex'))
  }
  public toString (): string {
    return this.buffer.toString('hex')
  }

  public equals (other: Address): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class KeyPair {
  public readonly publicKey: Bytes64
  private readonly privateKey: Bytes32
  constructor (
    privateKey?: Bytes32
  ) {
    if (privateKey === undefined) {
      let privateKeyBuff: Buffer
      do {
        privateKeyBuff = randomBytes(32)
      } while (!secp256k1.privateKeyVerify(privateKeyBuff))
      privateKey = new Bytes32(privateKeyBuff)
    }
    this.privateKey = privateKey
    this.publicKey = new Bytes64(secp256k1.publicKeyCreate(privateKey.buffer, false).slice(1))
  }

  // Ethereum compatible
  public sign (messageHash: Hash) {
    return Signature.sign(messageHash, this.privateKey)
  }

  public address (): Address {
    return Address.fromPublicKey(this.publicKey)
  }
}
