import { Hash } from '../cryptography'
import { HashStore } from '../hash-store'
import { Serializable } from '../serializable'
import { Optional } from '../optional'
import { UInt32, UInt8 } from '../bytes'
import { Node, NodeRef, Key } from './common'
import { Null } from './null'
import { Extension } from './extension'
import { Branch } from './branch'

export class Leaf<T extends Serializable> implements Node<T> {
  public get hash (): Hash { return Hash.fromData(this.serialize()) }
  private constructor (
    public readonly key: Key,
    public readonly value: T
  ) { }
  public static construct<T extends Serializable> (key: Key, value: T): Node<T> {
    return new Leaf(key, value)
  }
  public *entries (_: HashStore<Node<T>>): IterableIterator<[Key, T]> {
    yield [this.key, this.value]
  } public get (_: HashStore < Node < T >> , key: Key): T | undefined {
    if (key.length === this.key.length && this.key.every((v,i) => v === key[i])) {
      return this.value
    }
    return undefined
  }
  public set (store: HashStore<Node<T>>, key: Key, value: T): Node<T> {
    const matchResult = Key.match(this.key, key)
    if (matchResult.equal) {
      return Leaf.construct(this.key, value)
    }
    let refs = new Array(16).fill(Null.construct()) as NodeRef<T>[]
    let val: Optional<T> = Optional.none()
    if (matchResult.remain1.length === 0) {
      val = Optional.some(this.value)
    } else {
      refs[Key.alphabetToIndex(matchResult.remain1[0])] = Leaf.construct(matchResult.remain1.slice(1), this.value)
    }
    if (matchResult.remain2.length === 0) {
      val = Optional.some(value)
    } else {
      refs[Key.alphabetToIndex(matchResult.remain2[0])] = Leaf.construct(matchResult.remain2.slice(1), value)
    }

    return Extension.construct(store, matchResult.prefix, Branch.construct(store, refs, val))
  }
  public delete (_: HashStore<Node<T>>, key: Key): Node<T> {
    if (key.length === this.key.length && this.key.every((v,i) => v === key[i])) {
      return Null.construct()
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
      UInt8.fromNumber(2).serialize(), // identify the Leaf
      UInt32.fromNumber(this.key.length).serialize(), buff,
      this.value.serialize()
    ])
  }
}
