import { Hash } from '../cryptography'
import { HashStore } from '../hash-store'
import { Serializable } from '../serializable'
import { Optional } from '../optional'
import { UInt32, UInt8 } from '../bytes'
import { Node, NodeRef, Key } from './common'
import { Null } from './null'
import { Leaf } from './leaf'
import { Branch } from './branch'

export class Extension<T extends Serializable> implements Node<T> {
  public get hash (): Hash { return Hash.fromData(this.serialize()) }
  private constructor (
    public readonly key: Key,
    public readonly ref: NodeRef<T>
  ) {}
  public static construct<T extends Serializable> (store: HashStore<Node<T>>, key: Key, ref: NodeRef<T>): Node<T> {
    const node = NodeRef.dereference(store, ref)
    if (key.length === 0) {
      return node
    }
    if (node instanceof Null) {
      return Null.construct()
    }
    if (node instanceof Extension) {
      const ext = node as Extension<T>
      return new Extension(key.concat(ext.key), ext.ref)
    }
    if (node instanceof Leaf) {
      const leaf = node as Leaf<T>
      return Leaf.construct(key.concat(leaf.key), leaf.value)
    }
    return new Extension(key, NodeRef.normalize(store, ref))
  }
  public *entries (store: HashStore<Node<T>>): IterableIterator<[Key, T]> {
    const node = NodeRef.dereference(store, this.ref)
    for (const [k, v] of node.entries(store)) {
      yield [[...this.key, ...k], v]
    }
  }
  public get (store: HashStore<Node<T>>, key: Key): T | undefined {
    if (this.key.every((v,i) => v === key[i])) {
      const node = NodeRef.dereference(store, this.ref)
      return node.get(store, key.slice(this.key.length))
    }
    return undefined
  }
  public set (store: HashStore<Node<T>>, key: Key, value: T): Node<T> {
    const matchResult = Key.match(this.key, key)
    if (matchResult.remain1.length === 0) {
      const node = NodeRef.dereference(store, this.ref)
      return Extension.construct(store, matchResult.prefix, node.set(store, matchResult.remain2, value))
    } else {
      let refs = new Array(16).fill(Null.construct()) as NodeRef<T>[]
      let val: Optional<T> = Optional.none()
      refs[Key.alphabetToIndex(matchResult.remain1[0])] = Extension.construct(store, matchResult.remain1.slice(1), this.ref)
      if (matchResult.remain2.length === 0) {
        val = Optional.some(value)
      } else {
        refs[Key.alphabetToIndex(matchResult.remain2[0])] = Leaf.construct(matchResult.remain2.slice(1), value)
      }

      return Extension.construct(store, matchResult.prefix, Branch.construct(store, refs, val))
    }
  }
  public delete (store: HashStore < Node < T >> , key: Key): Node<T> {
    const matchResult = Key.match(this.key, key)
    if (matchResult.remain1.length === 0) {
      const node = NodeRef.dereference(store, this.ref)
      return Extension.construct(store, matchResult.prefix, node.delete(store, matchResult.remain2))
    }
    return this
  }
  public reference (store: HashStore<Node<T>>): Hash | Node < T > {
    // TODO: fix serialize protocol and don't save by hash of small node
    store.set(this)
    return this.hash
  }
  public serialize (): Buffer {
    // TODO: more efficient encode like ethereum
    const isEven = this.key.length % 2 === 0
    const evenKey = isEven ? this.key : ['0'].concat(this.key) // make even length
    const buff = new Buffer(evenKey.length / 2)
    for (let i = 0; i < buff.byteLength; i += 1) {
      buff.write(evenKey[i * 2] + evenKey[i * 2 + 1], i, 1, 'hex')
    }
    return Buffer.concat([
      UInt8.fromNumber(3).serialize(), // identify the Extension
      UInt32.fromNumber(this.key.length).serialize(), buff,
      this.ref.serialize()
    ])
  }
}
