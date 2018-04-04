import { Hash } from '../cryptography'
import { HashStore } from '../hash-store'
import { Serializable } from '../serializable'
import { Optional } from '../optional'
import { UInt8 } from '../bytes'
import { Node, NodeRef, Key } from './common'
import { Null } from './null'
import { Leaf } from './leaf'
import { Extension } from './extension'

export class Branch<T extends Serializable> implements Node<T> {
  public get hash (): Hash { return Hash.fromData(this.serialize()) }
  constructor (
    public readonly refs: NodeRef<T>[],
    public readonly value: Optional<T>
  ) {
    if (refs.length !== 16) { throw new Error('invalid nodes length') }
  }
  public static construct<T extends Serializable> (store: HashStore<Node<T>>, refs: (NodeRef<T>)[], value: Optional<T>): Node<T> {
    const notNull = refs.map<[NodeRef<T>, number]>((r,i) => [r,i]).filter(v => !(v['0'] instanceof Null))
    return value.match(
      v => {
        // no branch, has value
        if (notNull.length === 0) { return Leaf.construct([], v) }
        return new Branch(refs.map(r => NodeRef.normalize(store, r)), Optional.some(v))
      },
      () => {
        // no branch, no value
        if (notNull.length === 0) { return Null.construct() }
        // one branch, no value
        if (notNull.length === 1) {
          const key = [Key.indexToAlphabet(notNull[0]['1'])]
          const ref = notNull[0]['0']
          return Extension.construct(store, key, ref)
        }
        return new Branch(refs.map(r => NodeRef.normalize(store, r)), Optional.none())
      }
    )
  }
  public *entries (store: HashStore<Node<T>>): IterableIterator<[Key, T]> {
    for (const v of this.value.match(v => [v], () => [])) {
      yield [[], v]
    }

    for (const [r, i] of this.refs.map<[NodeRef<T>, number]>((r, i) => [r, i])) {
      const node = NodeRef.dereference(store, r)
      if (! (node instanceof Null)) {
        for (const [k, v] of node.entries(store)) {
          yield [[Key.indexToAlphabet(i), ...k], v]
        }
      }
    }
  }
  public get (store: HashStore<Node<T>>, key: Key): T | undefined {
    if (key.length === 0) { return this.value.match(v => v, () => undefined) }
    return NodeRef.dereference(store, this.refs[Key.alphabetToIndex(key[0])]).get(store, key.slice(1))
  }
  public set (store: HashStore <Node<T>>, key: Key, value: T): Node<T> {
    if (key.length === 0) { return Branch.construct(store, this.refs, Optional.some(value)) }
    const index = Key.alphabetToIndex(key[0])
    const node = NodeRef.dereference(store, this.refs[index]).set(store, key.slice(1), value)
    const copy = this.refs.slice()
    copy[index] = node
    return Branch.construct(store, copy, this.value)
  }
  public delete (store: HashStore<Node<T>> , key: Key): Node<T> {
    if (key.length === 0) { return Branch.construct(store, this.refs, Optional.none<T>()) }

    const index = Key.alphabetToIndex(key[0])
    const node = NodeRef.dereference(store, this.refs[index]).delete(store, key.slice(1))
    const copy = this.refs.slice()
    copy[index] = node
    return Branch.construct(store, copy, this.value)
  }
  public reference (store: HashStore<Node<T>>): Hash | Node < T > {
    // TODO: fix serialize protocol and don't save by hash of small node
    store.set(this)
    return this.hash
  }
  public serialize (): Buffer {
    return Buffer.concat([
      UInt8.fromNumber(1).serialize(), // identify the Branch
      ...this.refs.map(r => r.serialize()),
      this.value.serialize(v => v.serialize())
    ])
  }
}
