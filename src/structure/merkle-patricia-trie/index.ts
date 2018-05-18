import { Hash, Hashable } from '../cryptography'
import { Optional } from '../optional'
import { MerkleProof } from '../merkle-proof'
import { Node, NodeStore, Content, Key } from './node'
import { deserialize, serialize } from '../serializable'

export { Node, NodeStore }

export class KeyValueProof {
  public readonly key: Buffer
  public readonly value: Buffer
  constructor (
    public readonly proof: MerkleProof
  ) {
    const content = deserialize(proof.values()[0], Content.deserialize)
    this.key = content.key
    this.value = content.value
  }

  public verify (expect: Hash): boolean { return this.proof.verify(expect) }
}

// Merkle Patricia trie implementation.
export class MerklePatriciaTrie implements Hashable, AsyncIterable<[Buffer, Buffer]> {
  get root (): Hash { return this._rootNode.hash }
  get hash (): Hash { return this._rootNode.hash }
  private _rootNode = Node.null
  private _initialized = false

  constructor (
    private readonly store: NodeStore
  ) { }
  public async init (): Promise<void> {
    this._rootNode = Node.null
    if (!this._initialized) {
      await this.store.set(this._rootNode.hash, this._rootNode)
      this._initialized = true
    }
  }
  public [Symbol.asyncIterator] (): AsyncIterableIterator<[Buffer, Buffer]> {
    this.checkInit()
    return this.entries()
  }
  public async *entries (): AsyncIterableIterator<[Buffer, Buffer]> {
    this.checkInit()
    for await (const content of this._rootNode.contents(this.store)) {
      yield [content.key, content.value]
    }
  }
  public async *keys (): AsyncIterableIterator<Buffer> {
    this.checkInit()
    for await (const kv of this.entries()) {
      yield kv['0']
    }
  }
  public async *values (): AsyncIterableIterator<Buffer> {
    this.checkInit()
    for await (const kv of this.entries()) {
      yield kv['1']
    }
  }
  public async get (key: Buffer): Promise<Optional<Buffer>> {
    this.checkInit()
    return (await this._rootNode.get(this.store, Key.bufferToKey(key))).match(
      c => Optional.some(c.value),
      () => Optional.none()
    )
  }
  public async set (key: Buffer, value: Buffer): Promise<void> {
    this.checkInit()
    await this.save(await this._rootNode.set(this.store, Key.bufferToKey(key), new Content(key, value)))
  }
  public async delete (key: Buffer): Promise<boolean> {
    this.checkInit()
    const prev = this.root
    await this.save(await this._rootNode.delete(this.store, Key.bufferToKey(key)))
    const deleted = !this.root.equals(prev)
    return deleted
  }
  public async clear (): Promise<void> {
    this.checkInit()
    this._rootNode = Node.null
  }
  public async prove (key: Buffer): Promise<KeyValueProof> {
    this.checkInit()
    const proof = await this._rootNode.prove(this.store, Key.bufferToKey(key))
    proof.optimize()
    return new KeyValueProof(proof)
  }
  private async save (root: Node): Promise<void> {
    const normalized = await root.normalize(this.store)
    await normalized.match(
      async node => { this._rootNode = await node.save(this.store) },
      async () => { this._rootNode = Node.null }
    )
  }
  private checkInit (): void {
    if (!this._initialized) { throw new Error('need initialize') }
  }
}

/* istanbul ignore next: it is for test and experiment  */
export class InMemoryNodeStore implements NodeStore {
  private store = new Map<string, Buffer>()
  public get (key: Hash): Promise<Node> {
    const value = this.store.get(key.buffer.toString('hex'))
    if (value) {
      return Promise.resolve(deserialize(value, Node.deserialize))
    } else {
      return Promise.reject(new Error('NotFound'))
    }
  }
  public set (key: Hash, value: Node): Promise<void> {
    this.store.set(key.buffer.toString('hex'), serialize(value))
    return Promise.resolve()
  }
}
