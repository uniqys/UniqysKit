import { Hash, Hashable } from './cryptography'
import { HashStore } from './hash-store'
import { Serializable } from './serializable'
import { Node, Key } from './merkle-patricia-trie-node/common'
import { Null } from './merkle-patricia-trie-node/null'

// Merkle Patricia trie implementation.
export class MerklePatriciaTrie<T extends Serializable> implements Map<Buffer, T>, Hashable {
  [Symbol.toStringTag]: 'Map'
  private rootNode: Node<T>
  get root (): Hash { return this.rootNode.hash }
  get hash (): Hash { return this.rootNode.hash }
  private _size: number
  get size (): number { return this._size }

  private readonly store: HashStore<Node<T>>

  constructor (
  ) {
    this._size = 0
    this.store = new HashStore()
    this.rootNode = Null.construct()
  }

  [Symbol.iterator] (): IterableIterator<[Buffer, T]> {
    return this.entries()
  }
  *entries (): IterableIterator<[Buffer, T]> {
    for (const kv of this.rootNode.entries(this.store)) {
      yield [Key.keyToBuffer(kv['0']), kv['1']]
    }
  }
  *keys (): IterableIterator<Buffer> {
    for (const kv of this.entries()) {
      yield kv['0']
    }
  }
  *values (): IterableIterator<T> {
    for (const kv of this.entries()) {
      yield kv['1']
    }
  }
  clear (): void {
    this._size = 0
    this.store.clear()
    this.rootNode = Null.construct()
  }
  delete (key: Buffer): boolean {
    const prev = this.rootNode.hash
    this.rootNode = this.rootNode.delete(this.store, Key.bufferToKey(key))
    this.store.set(this.rootNode)
    const deleted = !prev.equals(this.rootNode.hash)
    if (deleted) { this._size-- }
    return deleted
  }
  forEach (callbackfn: (value: T, key: Buffer, map: Map<Buffer, T>) => void, thisArg?: any): void {
    for (const kv of this.entries()) {
      callbackfn.call(thisArg, kv['1'], kv['0'], this)
    }
  }
  get (key: Buffer): T | undefined {
    return this.rootNode.get(this.store, Key.bufferToKey(key))
  }
  has (key: Buffer): boolean {
    return this.get(key) !== undefined
  }
  set (key: Buffer, value: T): this {
    this.delete(key)
    this.rootNode = this.rootNode.set(this.store, Key.bufferToKey(key), value)
    this.store.set(this.rootNode)
    this._size++
    return this
  }
}
