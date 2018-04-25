import { Hash, Hashable } from './cryptography'
import { Node, Key, NodeStore } from './merkle-patricia-trie-node/common'
import { Null } from './merkle-patricia-trie-node/null'
import { Optional } from './optional'

// Merkle Patricia trie implementation.
export class MerklePatriciaTrie implements Hashable, AsyncIterable<[Buffer, Buffer]> {
  get root (): Hash { return this._rootHash }
  get hash (): Hash { return this._rootHash }
  get size (): number { return this._size }
  private _rootNode: Node = new Null()
  private _rootHash: Hash = new Hash(Buffer.alloc(32))
  private _size: number = 0

  constructor (
    private readonly store: NodeStore
  ) { }

  public init () { return this.clear() }

  public [Symbol.asyncIterator] (): AsyncIterableIterator<[Buffer, Buffer]> {
    return this.entries()
  }
  public async *entries (): AsyncIterableIterator<[Buffer, Buffer]> {
    for await (const kv of this._rootNode.entries(this.store)) {
      yield [Key.keyToBuffer(kv['0']), kv['1']]
    }
  }
  public async *keys (): AsyncIterableIterator<Buffer> {
    for await (const kv of this.entries()) {
      yield kv['0']
    }
  }
  public async *values (): AsyncIterableIterator<Buffer> {
    for await (const kv of this.entries()) {
      yield kv['1']
    }
  }
  public async get (key: Buffer): Promise<Optional<Buffer>> {
    return this._rootNode.get(this.store, Key.bufferToKey(key))
  }
  public async set (key: Buffer, value: Buffer): Promise<void> {
    await this.delete(key)
    this._rootNode = await this._rootNode.set(this.store, Key.bufferToKey(key), value)
    this._rootHash = await this.store.set(this._rootNode)
    this._size++
    return
  }
  public async delete (key: Buffer): Promise<boolean> {
    const prev = this.root
    this._rootNode = await this._rootNode.delete(this.store, Key.bufferToKey(key))
    this._rootHash = await this.store.set(this._rootNode)
    const deleted = !prev.equals(this.root)
    if (deleted) { this._size-- }
    return deleted
  }
  public async clear (): Promise<void> {
    this._size = 0
    this._rootNode = new Null()
    this._rootHash = await this.store.set(this._rootNode)
  }
}
