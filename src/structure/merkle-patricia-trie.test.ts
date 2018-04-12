import { MerklePatriciaTrie } from './merkle-patricia-trie'
import { Leaf } from './merkle-patricia-trie-node/leaf'
import { Key, Node, NodeRef, NodeStore } from './merkle-patricia-trie-node/common'
import { Null } from './merkle-patricia-trie-node/null'
import { Extension } from './merkle-patricia-trie-node/extension'
import { Branch } from './merkle-patricia-trie-node/branch'
import { Optional } from './optional'
import { Hash } from './cryptography'

class InMemoryNodeStore implements NodeStore {
  private store = new Map<string, Buffer>()
  public get (key: Hash): Promise<Node> {
    const value = this.store.get(key.serialize().toString('hex'))
    if (value) {
      return Promise.resolve(Node.deserialize(value).value)
    } else {
      return Promise.reject(new Error('NotFound'))
    }
  }
  public delete (key: Hash): Promise<void> {
    this.store.delete(key.serialize().toString('hex'))
    return Promise.resolve()
  }
  public set (value: Node): Promise<Hash> {
    const buff = value.serialize()
    const key = Hash.fromData(buff)
    this.store.set(key.serialize().toString('hex'), buff)
    return Promise.resolve(key)
  }
}

async function collect<T> (iter: AsyncIterable<T>): Promise<T[]> {
  let collect = []
  for await (const v of iter) {
    collect.push(v)
  }
  return collect
}

describe('Merkle Patricia Trie', () => {
  const cat = Buffer.from('cat')
  const catalog = Buffer.from('catalog')
  const catalyst = Buffer.from('catalyst')
  const category = Buffer.from('category')
  const cattle = Buffer.from('cattle')
  const meow = Buffer.from('meow')
  const foo = Buffer.from('foo')
  const bar = Buffer.from('bar')

  let mpt = new MerklePatriciaTrie(new InMemoryNodeStore())
  beforeEach(async () => {
    await mpt.init()
  })

  it('can set and get values of key', async () => {
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    expect(mpt.size).toBe(2)
    expect((await mpt.get(cat)).match(v => v.equals(meow), () => false)).toBeTruthy()
    expect((await mpt.get(catalyst)).match(v => v.equals(foo), () => false)).toBeTruthy()
  })
  it('return optional when get value', async () => {
    await mpt.set(cat, meow)
    expect((await mpt.get(cat)).hasValue).toBeTruthy()
    expect((await mpt.get(catalog)).hasValue).not.toBeTruthy()
  })
  it('can delete a value of key', async () => {
    await mpt.set(cat, meow)
    expect((await mpt.get(cat)).hasValue).toBeTruthy()
    await mpt.delete(cat)
    expect(mpt.size).toBe(0)
    expect((await mpt.get(cat)).hasValue).not.toBeTruthy()
  })
  it('can update a value of key', async () => {
    await mpt.set(cat, foo)
    await mpt.set(cat, meow)
    expect(mpt.size).toBe(1)
    expect((await mpt.get(cat)).match(v => v.equals(meow), () => false)).toBeTruthy()
  })
  it('can clear values', async () => {
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    expect(mpt.size).toBe(2)
    await mpt.clear()
    expect(mpt.size).toBe(0)
    expect((await mpt.get(cat)).hasValue).not.toBeTruthy()
    expect((await mpt.get(catalyst)).hasValue).not.toBeTruthy()
  })
  it('iterate empty', async () => {
    expect(await collect(mpt)).toEqual([])
    expect(await collect(mpt.keys())).toEqual([])
    expect(await collect(mpt.values())).toEqual([])
  })
  it('iterate key-values in dictionary order', async () => {
    await mpt.set(category, bar)
    await mpt.set(cat, meow)
    await mpt.set(catalyst, foo)
    await mpt.set(cattle, foo)
    await mpt.set(catalog, bar)
    expect(await collect(mpt)).toEqual([[cat, meow], [catalog, bar], [catalyst, foo], [category, bar], [cattle, foo]])
    expect(await collect(mpt.keys())).toEqual([cat, catalog, catalyst, category, cattle])
    expect(await collect(mpt.values())).toEqual([meow, bar, foo, bar, foo])
  })
  it('can set values in another order', async () => {
    // for another process of constructing
    await mpt.set(catalyst, foo)
    await mpt.set(catalog, bar)
    await mpt.set(cat, meow)
    await mpt.set(cattle, foo)
    await mpt.set(category, bar)
    expect(await collect(mpt)).toEqual([[cat, meow], [catalog, bar], [catalyst, foo], [category, bar], [cattle, foo]])
  })
  it('is hashable on root node', async () => {
    await mpt.set(cat, meow)
    const root = Hash.fromData(new Leaf(Key.bufferToKey(cat), meow).serialize())

    expect(mpt.root.equals(root)).toBeTruthy()
    expect(mpt.hash.equals(root)).toBeTruthy()
  })
  it('is deterministic', async () => {
    const mpt1 = new MerklePatriciaTrie(new InMemoryNodeStore())
    await mpt1.init()
    await mpt1.set(cat, meow)
    await mpt1.set(catalyst, foo)
    await mpt1.set(cattle, foo)

    const mpt2 = new MerklePatriciaTrie(new InMemoryNodeStore())
    await mpt2.init()
    await mpt2.set(catalyst, meow)
    await mpt2.set(catalog, bar)
    await mpt2.delete(catalog)
    await mpt2.set(cattle, foo)
    await mpt2.set(catalyst, foo)
    await mpt2.set(cat, meow)
    await mpt2.delete(catalog)

    expect(mpt1.root.equals(mpt2.root)).toBeTruthy()
  })
})

// A little confusing
describe('Node normalizing', () => {
  const key = Key.bufferToKey(Buffer.from('foo'))
  const value = Buffer.from('bar')
  let store: NodeStore
  let nullNode: Node
  let leafNode: Leaf
  let branchNode: Branch
  let extensionNode: Extension
  beforeEach(async () => {
    store = new InMemoryNodeStore()
    nullNode = new Null()
    leafNode = new Leaf(key, value)
    const branch = await Branch.construct(store, new Array(16).fill(NodeRef.ofNode(leafNode)), Optional.none())
    if (branch instanceof Branch) { branchNode = branch }
    const extension = await Extension.construct(store, key, NodeRef.ofNode(branchNode))
    if (extension instanceof Extension) { extensionNode = extension }
  })
  describe('Extension', () => {
    it('construct null if ref to null', async () => {
      const constructed = await Extension.construct(store, key, NodeRef.ofNode(nullNode))
      expect(constructed).toBeInstanceOf(Null)
    })
    it('construct concatenated leaf if ref to leaf', async () => {
      const constructed = await Extension.construct(store, key, NodeRef.ofNode(leafNode))
      expect(constructed).toBeInstanceOf(Leaf)
      expect((constructed as Leaf).key).toEqual([...key, ...leafNode.key])
    })
    it('construct extension if ref to branch', async () => {
      const constructed = await Extension.construct(store, key, NodeRef.ofNode(branchNode))
      expect(constructed).toBeInstanceOf(Extension)
      expect(await (constructed as Extension).ref.dereference(store)).toEqual(branchNode)
    })
    it('construct concatenated extension if ref to extension', async () => {
      const constructed = await Extension.construct(store, key, NodeRef.ofNode(extensionNode))
      expect(constructed).toBeInstanceOf(Extension)
      expect((constructed as Extension).key).toEqual([...key, ...extensionNode.key])
    })
  })
  describe('Branch', () => {
    it('construct null if no branch and no value', async () => {
      const constructed = await Branch.construct(store, new Array(16).fill(NodeRef.ofNode(nullNode)), Optional.none())
      expect(constructed).toBeInstanceOf(Null)
    })
    it('construct leaf if no branch and has value', async () => {
      const constructed = await Branch.construct(store, new Array(16).fill(NodeRef.ofNode(nullNode)), Optional.some(value))
      expect(constructed).toBeInstanceOf(Leaf)
      expect((constructed as Leaf).key).toEqual([])
      expect((constructed as Leaf).value.equals(value)).toBeTruthy()
    })
    it('construct extension if one branch and no value', async () => {
      const constructed = await Branch.construct(store, new Array(15).fill(nullNode).concat(extensionNode).map(NodeRef.ofNode), Optional.none())
      expect(constructed).toBeInstanceOf(Extension)
      expect((constructed as Extension).key).toEqual(['f', ...extensionNode.key])
      expect((constructed as Extension).ref).toEqual(extensionNode.ref)
    })
    it('construct branch when other case', async () => {
      const constructed = await Branch.construct(store, new Array(15).fill(nullNode).concat(leafNode).map(NodeRef.ofNode), Optional.some(value))
      expect(constructed).toBeInstanceOf(Branch)
    })
  })
})
