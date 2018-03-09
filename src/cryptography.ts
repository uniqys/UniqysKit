import createKeccakHash from 'keccak'
import secp256k1 from 'secp256k1'
import { Bytes32, Bytes64, UInt8 } from 'bytes'
import { randomBytes } from 'crypto'

export class Hash extends Bytes32 {
  public static fromData (data: string | Buffer | DataView) {
    return new Hash(createKeccakHash('keccak256').update(data).digest())
  }
}

export interface Hashable {
  hash: Hash
}

export class KeyPair {
  public readonly publicKey: Bytes64
  private readonly privateKey: Bytes32
  constructor (
    privateKey?: Buffer
  ) {
    if (privateKey === undefined) {
      do {
        privateKey = randomBytes(32)
      } while (!secp256k1.privateKeyVerify(privateKey))
    }
    this.privateKey = new Bytes32(privateKey)
    this.publicKey = new Bytes64(secp256k1.publicKeyCreate(privateKey, false).slice(1))
  }

  // Ethereum compatible
  public sign (messageHash: Hash) {
    return Signature.sign(messageHash, this.privateKey)
  }
}

export class Signature implements Hashable {
  public readonly buffer: Buffer
  public readonly hash: Hash

  constructor (
    signature: Bytes64,
    recovery: UInt8
  ) {
    this.buffer = Buffer.concat([
      signature.buffer,
      recovery.buffer
    ])
    this.hash = Hash.fromData(this.buffer)
  }

  // Ethereum compatible
  public static sign (messageHash: Hash, privateKey: Bytes32) {
    const sig = secp256k1.sign(new Buffer(messageHash.buffer), new Buffer(privateKey.buffer))

    return new Signature(new Bytes64(sig.signature), UInt8.fromNumber(sig.recovery))
  }

  public recover (messageHash: Hash): Bytes64 {
    return new Bytes64(secp256k1.recover(messageHash.buffer, this.buffer.slice(0, 64), this.buffer.readUInt8(64), false).slice(1))
  }
}
