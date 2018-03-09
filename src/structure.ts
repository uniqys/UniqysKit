import { Hash, Hashable } from 'cryptography'

export class MerkleTree<T extends Hashable> {
  public readonly root: Hash

  constructor (
    _: T[]
  ) {
    // TODO: implementation
    const buf = new Buffer(32)
    buf.write('The quick brown fox jumps over the lazy dog')
    this.root = new Hash(buf)
  }
}
