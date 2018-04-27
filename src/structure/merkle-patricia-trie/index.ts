import { Hash, Hashable } from '../cryptography'
import { Optional } from '../optional'
import { MerkleProof } from '../merkle-proof'
import { Node, NodeStore, Content, Key } from './node'

export { Node, NodeStore }

export class KeyValueProof {
  public readonly key: Buffer
  public readonly value: Buffer
  constructor (
    public readonly proof: MerkleProof
  ) {
    const content = Content.deserialize(proof.values()[0]).value
    this.key = content.key
    this.value = content.value
  }

  public verify (expect: Hash): boolean { return this.proof.verify(expect) }
}

// Merkle Patricia trie implementation.
export class MerklePatriciaTrie implements Hashable, AsyncIterable<[Buffer, Buffer]> {
  get root (): Hash { return this._rootHash }
  get hash (): Hash { return this._rootHash }
  get size (): number { return this._size }
  private _nullHash = Node.null().hash
  private _rootHash = this._nullHash
  private _size = 0
  private _initialized = false

  constructor (
    private readonly store: NodeStore
  ) { }
  public async init (): Promise<void> {
    await this.store.set(this._rootHash, Node.null())
    this._size = 0
    this._initialized = true
  }
  public [Symbol.asyncIterator] (): AsyncIterableIterator<[Buffer, Buffer]> {
    this.checkInit()
    return this.entries()
  }
  public async *entries (): AsyncIterableIterator<[Buffer, Buffer]> {
    this.checkInit()
    for await (const content of (await this.rootNode()).contents(this.store)) {
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
    return (await (await this.rootNode()).get(this.store, Key.bufferToKey(key))).match(
      c => Optional.some(c.value),
      () => Optional.none()
    )
  }
  public async set (key: Buffer, value: Buffer): Promise<void> {
    this.checkInit()
    const root = await this.rootNode()
    if ((await root.get(this.store, Key.bufferToKey(key))).isNone()) { this._size++ }
    await this.save(await root.set(this.store, Key.bufferToKey(key), new Content(key, value)))
  }
  public async delete (key: Buffer): Promise<boolean> {
    this.checkInit()
    const root = await this.rootNode()
    return (await root.get(this.store, Key.bufferToKey(key))).match(
      async _ => {
        await this.save(await root.delete(this.store, Key.bufferToKey(key)))
        this._size--
        return true
      },
      async () => false
    )
  }
  public async clear (): Promise<void> {
    this.checkInit()
    this._rootHash = this._nullHash
    this._size = 0
  }
  public async prove (key: Buffer): Promise<KeyValueProof> {
    this.checkInit()
    const proof = await (await this.rootNode()).prove(this.store, Key.bufferToKey(key))
    proof.optimize()
    return new KeyValueProof(proof)
  }
  private async rootNode (): Promise<Node> {
    return this.store.get(this.root)
  }
  private async save (root: Node): Promise<void> {
    const normalized = await root.normalize(this.store)
    await normalized.match(
      async node => { this._rootHash = await node.save(this.store) },
      async () => { this._rootHash = this._nullHash }
    )
  }
  private checkInit (): void {
    if (!this._initialized) { throw new Error('need initialize') }
  }
}
