import { Deserialized } from '../serializable'
import { Optional } from '../optional'
import { UInt8, UInt32 } from '../bytes'
import { Node, NodeRef, Key, NodeStore } from './common'
import { Null } from './null'
import { Leaf } from './leaf'
import { Extension } from './extension'

export class Branch implements Node {
  constructor (
    public readonly refs: NodeRef[],
    public readonly value: Optional<Buffer>
  ) {
    if (refs.length !== 16) { throw new Error('invalid nodes length') }
  }
  public static async construct (store: NodeStore, refs: NodeRef[], value: Optional<Buffer>): Promise<Node> {
    const notNull = refs.map((r,i) => { return { ref: r, alphabet: Key.indexToAlphabet(i) } }).filter(v => !v.ref.isNull)
    return value.match(
      async v => {
        // no branch, has value
        if (notNull.length === 0) { return new Leaf([], v) }
        return new Branch(await Promise.all(refs.map(r => r.normalize(store))), Optional.some(v))
      },
      async () => {
        // no branch, no value
        if (notNull.length === 0) { return new Null() }
        // one branch, no value
        if (notNull.length === 1) {
          const key = [notNull[0].alphabet]
          const ref = notNull[0].ref
          return Extension.construct(store, key, ref)
        }
        return new Branch(await Promise.all(refs.map(r => r.normalize(store))), Optional.none())
      }
    )
  }
  public static deserialize (buffer: Buffer): Deserialized<Branch> {
    let refsBuf = buffer.slice(1) // except label
    let refs = []
    for (let i = 0; i < 16; i++) {
      const result = NodeRef.deserialize(refsBuf)
      refsBuf = result.rest
      refs.push(result.value)
    }
    const { rest: rest, value: value } = Optional.deserialize((buf) => {
      const { rest: valueBuf, value: valueLength } = UInt32.deserialize(buf)
      const value = valueBuf.slice(0, valueLength.number)
      return { rest: valueBuf.slice(valueLength.number), value: value }
    })(refsBuf)
    return { rest: rest, value: new Branch(refs, value) }
  }
  public serialize (): Buffer {
    return Buffer.concat([
      UInt8.fromNumber(1).serialize(), // identify the Branch
      ...this.refs.map(r => r.serialize()),
      this.value.serialize(v => Buffer.concat([UInt32.fromNumber(v.byteLength).serialize(), v]))
    ])
  }
  public async *entries (store: NodeStore): AsyncIterableIterator<[Key, Buffer]> {
    for (const v of this.value.match(v => [v], () => [])) {
      yield [[], v]
    }

    for (const [r, i] of this.refs.map<[NodeRef, number]>((r, i) => [r, i])) {
      const node = await r.dereference(store)
      if (! (node instanceof Null)) {
        for await (const [k, v] of node.entries(store)) {
          yield [[Key.indexToAlphabet(i), ...k], v]
        }
      }
    }
  }
  public async get (store: NodeStore, key: Key): Promise<Optional<Buffer>> {
    if (key.length === 0) { return this.value }
    const node = await this.refs[Key.alphabetToIndex(key[0])].dereference(store)
    return node.get(store, key.slice(1))
  }
  public async set (store: NodeStore, key: Key, value: Buffer): Promise<Node> {
    if (key.length === 0) { return Branch.construct(store, this.refs, Optional.some(value)) }
    const index = Key.alphabetToIndex(key[0])
    const node = await (await this.refs[index].dereference(store)).set(store, key.slice(1), value)
    const copy = this.refs.slice()
    copy[index] = NodeRef.ofNode(node)
    return Branch.construct(store, copy, this.value)
  }
  public async delete (store: NodeStore , key: Key): Promise<Node> {
    if (key.length === 0) { return Branch.construct(store, this.refs, Optional.none()) }

    const index = Key.alphabetToIndex(key[0])
    const node = await (await this.refs[index].dereference(store)).delete(store, key.slice(1))
    const copy = this.refs.slice()
    copy[index] = NodeRef.ofNode(node)
    return Branch.construct(store, copy, this.value)
  }
  public async reference (store: NodeStore): Promise<NodeRef> {
    // TODO: fix serialize protocol and don't save by hash of small node
    const hash = await store.set(this)
    return NodeRef.ofHash(hash)
  }
}
