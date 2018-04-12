import { Serializable, Deserialized } from '../serializable'
import { Hash } from '../cryptography'
import { Optional } from '../optional'
import { Either } from '../either'
import { Null } from './null'
import { Leaf } from './leaf'
import { Branch } from './branch'
import { Extension } from './extension'

export interface Node extends Serializable {
  entries (store: NodeStore): AsyncIterableIterator<[Key, Buffer]>
  get (store: NodeStore, key: Key): Promise<Optional<Buffer>>
  set (store: NodeStore, key: Key, value: Buffer): Promise<Node>
  delete (store: NodeStore, key: Key): Promise<Node>
  reference (store: NodeStore): Promise<NodeRef>
}
export namespace Node {
  export function deserialize (buffer: Buffer): Deserialized<Node> {
    const label = buffer.readUInt8(0)
    switch (label) {
      case 0: return Null.deserialize(buffer)
      case 1: return Branch.deserialize(buffer)
      case 2: return Leaf.deserialize(buffer)
      case 3: return Extension.deserialize(buffer)
      default: throw new Error()
    }
  }
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

export class NodeRef implements Serializable {
  constructor (
    private readonly either: Either<Hash, Node>
  ) {}
  public static ofHash (hash: Hash): NodeRef { return new NodeRef(Either.left(hash)) }
  public static ofNode (node: Node): NodeRef { return new NodeRef(Either.right(node)) }
  public static deserialize (buffer: Buffer): Deserialized<NodeRef> {
    const { rest: rest, value: either } = Either.deserialize(Hash.deserialize, Node.deserialize)(buffer)
    return { rest: rest, value: new NodeRef(either) }
  }
  public serialize (): Buffer {
    return this.either.serialize(h => h.serialize(), v => v.serialize())
  }
  public normalize (store: NodeStore): Promise<NodeRef> {
    return this.either.match(
      _hash => Promise.resolve(this),
      node => node.reference(store)
    )
  }
  public dereference (store: NodeStore): Promise<Node> {
    return this.either.match(
      hash => store.get(hash),
      node => Promise.resolve(node)
    )
  }
  // This is a trick using knowledge of Null node implementation.
  public get isNull (): boolean {
    return this.either.match(
      _ => false,
      node => node instanceof Null
    )
  }
}

// Store of node, that can store node and get it by hash
export interface NodeStore {
  get (key: Hash): Promise<Node>
  set (value: Node): Promise <Hash>
}

// for experiment and test
