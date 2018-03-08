import { keccak_256, Message } from 'js-sha3'
import * as secp256k1 from 'secp256k1'

export class Bytes32 {
  constructor (
    public readonly buffer: ArrayBuffer
  ) {
    if (buffer.byteLength !== 32) { throw TypeError() }
  }
}
export class Hash extends Bytes32 {
  public static fromMessage (message: Message) {
    return new Hash(keccak_256.create().update(message).arrayBuffer())
  }
}

export class Signature {
  constructor (
    public readonly r: Bytes32,
    public readonly s: Bytes32,
    public readonly v: number

  ) { }

  // Ethereum compatible
  public static sign (messageHash: Hash, privateKey: Bytes32) {
    const sig = secp256k1.sign(new Buffer(messageHash.buffer), new Buffer(privateKey.buffer))

    return new Signature(
      new Bytes32(sig.signature.slice(0, 32).buffer),
      new Bytes32(sig.signature.slice(32, 64).buffer),
      sig.recovery + 27
    )
  }
}
