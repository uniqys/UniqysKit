import { Hash, Hashable } from 'cryptography'

export class MerkleTree<T extends Hashable> implements Iterable<T>, Hashable {
  public readonly hash: Hash
  public readonly root: Hash

  constructor (
    public readonly items: T[]
  ) {
    // TODO: implementation
    const buf = new Buffer(32)
    buf.write('The quick brown fox jumps over the lazy dog')
    this.root = new Hash(buf)
    this.hash = this.root
  }

  [Symbol.iterator] (): Iterator<T> {
    return this.items[Symbol.iterator]()
  }
}
