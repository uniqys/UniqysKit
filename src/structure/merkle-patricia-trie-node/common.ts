import { Serializable } from '../serializable'
import { HashStore } from '../hash-store'
import { Hash, Hashable } from '../cryptography'

export interface Node<T extends Serializable> extends Hashable, Serializable {
  entries (store: HashStore<Node<T>>): IterableIterator<[Key, T]>
  get (store: HashStore<Node<T>>, key: Key): T | undefined
  set (store: HashStore<Node<T>>, key: Key, value: T): Node<T>
  delete (store: HashStore<Node<T>>, key: Key): Node<T>
  reference (store: HashStore<Node<T>>): NodeRef<T>
}

export type Key = Key.Alphabet[]
export namespace Key {
  export type Alphabet =
    '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' |
    '8' | '9' | 'a' | 'b' | 'c' | 'd' | 'e' | 'f'
  export function alphabetToIndex (alphabet: Alphabet): number {
    return parseInt(alphabet, 16)
  }
  export function indexToAlphabet (index: number): Alphabet {
    return index.toString(16)[0] as Alphabet
  }
  export function keyToBuffer (key: Key): Buffer {
    return Buffer.from(key.join(''), 'hex')
  }
  export function bufferToKey (buf: Buffer): Key {
    return buf.toString('hex').split('') as Key
  }
  export function match (key1: Key, key2: Key): { equal: boolean, prefix: Key, remain1: Key, remain2: Key } {
    let diffIndex = key1.findIndex((v, i) => v !== key2[i])
    diffIndex = diffIndex === -1 ? key1.length : diffIndex
    return {
      equal: key1.length === key2.length && key1.length === diffIndex,
      prefix: key1.slice(0, diffIndex),
      remain1: key1.slice(diffIndex),
      remain2: key2.slice(diffIndex)
    }
  }
}

export type NodeRef<T extends Serializable> = Hash | Node<T>
export namespace NodeRef {
  export function normalize<T extends Serializable> (store: HashStore<Node<T>>, ref: NodeRef<T>): NodeRef<T> {
    if (ref instanceof Hash) { return ref }
    return ref.reference(store)
  }
  export function dereference<T extends Serializable> (store: HashStore<Node<T>>, ref: NodeRef<T>): Node<T> {
    if (ref instanceof Hash) {
      const node = store.get(ref)
      if (node === undefined) { throw new Error('hash store missed') }
      return node
    }
    return ref
  }
}
