import { Hash, Hashable } from './cryptography'

// This is read like a Map and updated like a Set
export class HashStore<V extends Hashable> {
  private store: Map<string, V>
  constructor (
  ) {
    this.store = new Map()
  }
  private static hashToString (hash: Hash): string {
    return hash.buffer.toString('hex')
  }
  private static stringToHash (str: string): Hash {
    return new Hash(new Buffer(str, 'hex'))
  }

  // read
  get (key: Hash): V | undefined {
    return this.store.get(HashStore.hashToString(key))
  }
  has (key: Hash): boolean {
    return this.store.has(HashStore.hashToString(key))
  }
  [Symbol.iterator] (): IterableIterator<[Hash, V] > {
    return this.entries()
  }
  *entries (): IterableIterator<[Hash, V]> {
    for (const kv of this.store.entries()) {
      yield [HashStore.stringToHash(kv['0']), kv['1']]
    }
  }
  *keys (): IterableIterator<Hash> {
    for (const k of this.store.keys()) {
      yield HashStore.stringToHash(k)
    }
  }
  values (): IterableIterator<V> {
    return this.store.values()
  }
  forEach (callbackfn: (value: V, key: Hash, map: Map<Hash, V>) => void, thisArg?: any): void {
    for (const kv of this.entries()) {
      callbackfn.call(thisArg, kv['1'], kv['0'], this)
    }
  }

  // update
  clear (): void {
    this.store.clear()
  }
  delete (value: V): boolean {
    return this.store.delete(HashStore.hashToString(value.hash))
  }
  set (value: V): this {
    this.store.set(HashStore.hashToString(value.hash), value)
    return this
  }
  get size (): number {
    return this.store.size
  }
}
