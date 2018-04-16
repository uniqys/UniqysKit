import { Deserialized } from '../serializable'
import { Optional } from '../optional'
import { UInt32, UInt8 } from '../bytes'
import { Node, NodeRef, Key, NodeStore } from './common'
import { Null } from './null'
import { Leaf } from './leaf'
import { Branch } from './branch'

export class Extension implements Node {
  private constructor (
    public readonly key: Key,
    public readonly ref: NodeRef
  ) {}
  public static async construct (store: NodeStore, key: Key, ref: NodeRef): Promise<Node> {
    const node = await ref.dereference(store)
    if (key.length === 0) {
      return node
    }
    if (node instanceof Null) {
      return node
    }
    if (node instanceof Extension) {
      return new Extension(key.concat(node.key), node.ref)
    }
    if (node instanceof Leaf) {
      return new Leaf(key.concat(node.key), node.value)
    }
    return new Extension(key, await ref.normalize(store))
  }
  public static deserialize (buffer: Buffer): Deserialized<Extension> {
    const keyLengthBuf = buffer.slice(1) // except label
    const { rest: keyBuf, value: keyLength } = UInt32.deserialize(keyLengthBuf)
    const isEven = keyLength.number % 2 === 0
    const keyBufSize = (isEven ? keyLength.number : keyLength.number + 1) / 2
    const evenKey = Key.bufferToKey(keyBuf.slice(0, keyBufSize))
    const key = isEven ? evenKey : evenKey.slice(1)
    const refBuf = keyBuf.slice(keyBufSize)
    const { rest: rest, value: ref } = NodeRef.deserialize(refBuf)
    return { rest: rest, value: new Extension(key, ref) }
  }
  public serialize (): Buffer {
    // TODO: more efficient encode like ethereum
    const isEven = this.key.length % 2 === 0
    const evenKey: Key = isEven ? this.key : ['0', ...this.key] // make even length
    return Buffer.concat([
      UInt8.fromNumber(3).serialize(), // identify the Extension
      UInt32.fromNumber(this.key.length).serialize(),
      Key.keyToBuffer(evenKey),
      this.ref.serialize()
    ])
  }
  public async *entries (store: NodeStore): AsyncIterableIterator<[Key, Buffer]> {
    const node = await this.ref.dereference(store)
    for await (const [k, v] of node.entries(store)) {
      yield [[...this.key, ...k], v]
    }
  }
  public async get (store: NodeStore, key: Key): Promise<Optional<Buffer>> {
    if (this.key.every((v,i) => v === key[i])) {
      const node = await this.ref.dereference(store)
      return node.get(store, key.slice(this.key.length))
    }
    return Optional.none()
  }
  public async set (store: NodeStore, key: Key, value: Buffer): Promise<Node> {
    const matchResult = Key.match(this.key, key)
    if (matchResult.remain1.length === 0) {
      const node = await this.ref.dereference(store)
      return Extension.construct(store, matchResult.prefix, NodeRef.ofNode(await node.set(store, matchResult.remain2, value)))
    } else {
      let refs = new Array(16).fill(NodeRef.ofNode(new Null())) as NodeRef[]
      let val: Optional<Buffer> = Optional.none()
      refs[Key.alphabetToIndex(matchResult.remain1[0])] = NodeRef.ofNode(await Extension.construct(store, matchResult.remain1.slice(1), this.ref))
      if (matchResult.remain2.length === 0) {
        val = Optional.some(value)
      } else {
        refs[Key.alphabetToIndex(matchResult.remain2[0])] = NodeRef.ofNode(new Leaf(matchResult.remain2.slice(1), value))
      }
      return Extension.construct(store, matchResult.prefix, NodeRef.ofNode(await Branch.construct(store, refs, val)))
    }
  }
  public async delete (store: NodeStore , key: Key): Promise<Node> {
    const matchResult = Key.match(this.key, key)
    if (matchResult.remain1.length === 0) {
      const node = await this.ref.dereference(store)
      return Extension.construct(store, matchResult.prefix, NodeRef.ofNode(await node.delete(store, matchResult.remain2)))
    }
    return this
  }
  public async reference (store: NodeStore): Promise<NodeRef> {
    // TODO: fix serialize protocol and don't save by hash of small node
    const hash = await store.set(this)
    return NodeRef.ofHash(hash)
  }
}
