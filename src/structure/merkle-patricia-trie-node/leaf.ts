import { Deserialized } from '../serializable'
import { Optional } from '../optional'
import { UInt32, UInt8 } from '../bytes'
import { Node, NodeRef, Key, NodeStore } from './common'
import { Null } from './null'
import { Extension } from './extension'
import { Branch } from './branch'

export class Leaf implements Node {
  constructor (
    public readonly key: Key,
    public readonly value: Buffer
  ) {}
  public static deserialize (buffer: Buffer): Deserialized<Leaf> {
    const keyLengthBuf = buffer.slice(1) // except label
    const { rest: keyBuf, value: keyLength } = UInt32.deserialize(keyLengthBuf)
    const isEven = keyLength.number % 2 === 0
    const keyBufSize = (isEven ? keyLength.number : keyLength.number + 1) / 2
    const evenKey = Key.bufferToKey(keyBuf.slice(0, keyBufSize))
    const key = isEven ? evenKey : evenKey.slice(1)
    const valueLengthBuf = keyBuf.slice(keyBufSize)
    const { rest: valueBuf, value: valueLength } = UInt32.deserialize(valueLengthBuf)
    const value = valueBuf.slice(0, valueLength.number)
    return { rest: valueBuf.slice(valueLength.number), value: new Leaf(key, value) }
  }
  public serialize (): Buffer {
    // TODO: more efficient encode like ethereum
    const isEven = this.key.length % 2 === 0
    const evenKey: Key = isEven ? this.key : ['0', ...this.key] // make even length
    return Buffer.concat([
      UInt8.fromNumber(2).serialize(), // identify the Leaf
      UInt32.fromNumber(this.key.length).serialize(),
      Key.keyToBuffer(evenKey),
      UInt32.fromNumber(this.value.byteLength).serialize(),
      this.value
    ])
  }
  public async * entries (_: NodeStore): AsyncIterableIterator <[Key, Buffer]> {
    yield [this.key, this.value]
  }
  public async get (_: NodeStore, key: Key): Promise <Optional<Buffer>> {
    if (key.length === this.key.length && this.key.every((v,i) => v === key[i])) {
      return Optional.some(this.value)
    }
    return Optional.none()
  }
  public async set (store: NodeStore , key: Key, value: Buffer): Promise <Node> {
    const matchResult = Key.match(this.key, key)
    if (matchResult.equal) {
      return new Leaf(this.key, value)
    }
    let refs = new Array(16).fill(NodeRef.ofNode(new Null()))
    let val: Optional<Buffer> = Optional.none()
    if (matchResult.remain1.length === 0) {
      val = Optional.some(this.value)
    } else {
      refs[Key.alphabetToIndex(matchResult.remain1[0])] = NodeRef.ofNode(new Leaf(matchResult.remain1.slice(1), this.value))
    }
    if (matchResult.remain2.length === 0) {
      val = Optional.some(value)
    } else {
      refs[Key.alphabetToIndex(matchResult.remain2[0])] = NodeRef.ofNode(new Leaf(matchResult.remain2.slice(1), value))
    }

    return Extension.construct(store, matchResult.prefix, NodeRef.ofNode(await Branch.construct(store, refs, val)))
  }
  public async delete (_: NodeStore, key: Key): Promise<Node> {
    if (key.length === this.key.length && this.key.every((v,i) => v === key[i])) {
      return new Null()
    }
    return this
  }
  public async reference (store: NodeStore): Promise<NodeRef> {
    // TODO: fix serialize protocol and don't save by hash of small node
    const hash = await store.set(this)
    return NodeRef.ofHash(hash)
  }
}
