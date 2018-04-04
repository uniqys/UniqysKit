import { Hash } from '../cryptography'
import { HashStore } from '../hash-store'
import { Serializable } from '../serializable'
import { UInt8 } from '../bytes'
import { Node, Key } from './common'
import { Leaf } from './leaf'

export class Null<T extends Serializable> implements Node<T>, Serializable {
  public readonly hash: Hash
  private constructor (
  ) {
    this.hash = Hash.fromData(this.serialize())
  }
  public static construct<T extends Serializable> (): Node<T> {
    return new Null()
  }
  public *entries (): IterableIterator<[Key, T]> {
    return undefined
  }
  public get (_1: HashStore<Node<T>>, _2: Key): T | undefined {
    return undefined
  }
  public set (_: HashStore<Node<T>>, key: Key, value: T): Node<T> {
    return Leaf.construct(key, value)
  }
  public delete (_1: HashStore<Node<T>>, _2: Key): Node<T> {
    return this
  }
  public reference (_: HashStore<Node<T>>): Hash | Node < T > {
    return this
  }
  public serialize (): Buffer {
    return UInt8.fromNumber(0).serialize() // identify the Null
  }
}
