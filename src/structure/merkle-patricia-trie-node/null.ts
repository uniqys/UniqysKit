import { Serializable, Deserialized } from '../serializable'
import { UInt8 } from '../bytes'
import { Node, Key, NodeRef, NodeStore } from './common'
import { Leaf } from './leaf'
import { Optional } from '../optional'

export class Null implements Node, Serializable {
  public static deserialize (buffer: Buffer): Deserialized<Null> {
    return { rest: buffer.slice(1), value: new Null() }
  }
  public serialize (): Buffer {
    return UInt8.fromNumber(0).serialize() // identify the Null
  }
  public async *entries (): AsyncIterableIterator<[Key, Buffer]> {
    return undefined
  }
  public async get (_1: NodeStore, _2: Key): Promise<Optional<Buffer>> {
    return Optional.none()
  }
  public async set (_: NodeStore, key: Key, value: Buffer): Promise<Node> {
    return new Leaf(key, value)
  }
  public async delete (_1: NodeStore, _2: Key): Promise<Node> {
    return this
  }
  public async reference (_: NodeStore): Promise<NodeRef> {
    return NodeRef.ofNode(this)
  }
}
