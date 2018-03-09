import createKeccakHash from 'keccak'
import secp256k1 from 'secp256k1'
import { Bytes32, UInt8 } from 'bytes'

export class Hash extends Bytes32 {
  public static fromData (data: string | Buffer | DataView) {
    return new Hash(createKeccakHash('keccak256').update(data).digest())
  }
}

export interface Hashable {
  hash: Hash
}

export class Signature implements Hashable {
  public readonly buffer: Buffer
  public readonly hash: Hash

  constructor (
    r: Bytes32,
    s: Bytes32,
    v: number // Uint8
  ) {
    this.buffer = Buffer.concat([
      r.buffer,
      s.buffer,
      UInt8.fromNumber(v).buffer
    ])
    this.hash = Hash.fromData(this.buffer)
  }

  // Ethereum compatible
  public static sign (messageHash: Hash, privateKey: Bytes32) {
    const sig = secp256k1.sign(new Buffer(messageHash.buffer), new Buffer(privateKey.buffer))

    return new Signature(
      new Bytes32(sig.signature.slice(0, 32)),
      new Bytes32(sig.signature.slice(32, 64)),
      sig.recovery + 27
    )
  }
}
