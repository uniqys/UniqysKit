import { Hash, Hashable } from './cryptography'

// Basic Merkle Tree
// But, doesn't copy leaf for fix CVE-2012-2459
export class MerkleTree<T extends Hashable> implements Iterable<T>, Hashable {
  public readonly hash: Hash
  public readonly root: Hash

  constructor (
    public readonly items: T[]
  ) {
    this.root = MerkleTree.rootHash(items)
    this.hash = this.root
  }

  private static rootHash<T extends Hashable> (items: T[]): Hash {
    if (items.length === 0) { return Hash.fromData(Buffer.alloc(0)) }
    if (items.length === 1) { return items[0].hash }

    const split = MerkleTree.splitPoint(items.length)
    return Hash.fromData(Buffer.concat([
      MerkleTree.rootHash(items.slice(0, split)).buffer,
      MerkleTree.rootHash(items.slice(split)).buffer
    ]))
  }

  private static splitPoint (x: number): number {
    // it use: i = 2^n, i < x <= 2i
    // also an option: i = n, x/2 <= i < x/2 + 1
    let i = 1
    while (i < x) { i <<= 1 }
    return i >> 1
  }

  [Symbol.iterator] (): Iterator<T > {
    return this.items[Symbol.iterator]()
  }
}
