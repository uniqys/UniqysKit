import { Serializable } from './serializable'
import { MerklePatriciaTrie } from './merkle-patricia-trie'
import { Leaf } from './merkle-patricia-trie-node/leaf'
import { Key, Node, NodeRef } from './merkle-patricia-trie-node/common'
import { Null } from './merkle-patricia-trie-node/null'
import { HashStore } from './hash-store'
import { Extension } from './merkle-patricia-trie-node/extension'
import { Branch } from './merkle-patricia-trie-node/branch'
import { Optional } from './optional'

class Value implements Serializable {
  constructor (public readonly message: string) {}
  serialize (): Buffer { return Buffer.from(this.message) }
}

describe('Merkle Patricia Trie', () => {
  const cat = Buffer.from('cat')
  const catalog = Buffer.from('catalog')
  const catalyst = Buffer.from('catalyst')
  const category = Buffer.from('category')
  const cattle = Buffer.from('cattle')
  const meow = new Value('meow')
  const foo = new Value('foo')
  const bar = new Value('bar')

  let mpt: MerklePatriciaTrie<Value>
  beforeEach(() => {
    mpt = new MerklePatriciaTrie()
  })

  it('can set and get values of key', () => {
    mpt.set(cat, meow)
    mpt.set(catalyst, foo)
    expect(mpt.size).toBe(2)
    expect(mpt.get(cat)!.message).toBe(meow.message)
    expect(mpt.get(catalyst)!.message).toBe(foo.message)
  })
  it('can check contain keys', () => {
    mpt.set(cat, meow)
    expect(mpt.has(cat)).toBeTruthy()
    expect(mpt.has(catalog)).not.toBeTruthy()
  })
  it('can delete a value of key', () => {
    mpt.set(cat, meow)
    mpt.delete(cat)
    expect(mpt.size).toBe(0)
    expect(mpt.get(cat)).toBeUndefined()
  })
  it('can update a value of key', () => {
    mpt.set(cat, foo)
    mpt.set(cat, meow)
    expect(mpt.size).toBe(1)
    expect(mpt.get(cat)!.message).toBe(meow.message)
  })
  it('can clear values', () => {
    mpt.set(cat, meow)
    mpt.set(catalyst, foo)
    mpt.clear()
    expect(mpt.size).toBe(0)
    expect(mpt.get(cat)).toBeUndefined()
    expect(mpt.get(catalyst)).toBeUndefined()
  })
  it('iterate empty', () => {
    expect(Array.from(mpt)).toEqual([])
    expect(Array.from(mpt.keys())).toEqual([])
    expect(Array.from(mpt.values())).toEqual([])
  })
  it('iterate key-values in dictionary order', () => {
    mpt.set(category, bar)
    mpt.set(cat, meow)
    mpt.set(catalyst, foo)
    mpt.set(cattle, foo)
    mpt.set(catalog, bar)
    expect(Array.from(mpt)).toEqual([[cat, meow], [catalog, bar], [catalyst, foo], [category, bar], [cattle, foo]])
    expect(Array.from(mpt.keys())).toEqual([cat, catalog, catalyst, category, cattle])
    expect(Array.from(mpt.values())).toEqual([meow, bar, foo, bar, foo])
    let count = 0
    mpt.forEach((value, key) => {
      switch (count) {
        case 0:
          expect(key.equals(cat)).toBeTruthy()
          expect(value.message).toBe(meow.message)
          break
        case 1:
          expect(key.equals(catalog)).toBeTruthy()
          expect(value.message).toBe(bar.message)
          break
        case 2:
          expect(key.equals(catalyst)).toBeTruthy()
          expect(value.message).toBe(foo.message)
          break
        case 3:
          expect(key.equals(category)).toBeTruthy()
          expect(value.message).toBe(bar.message)
          break
        case 4:
          expect(key.equals(cattle)).toBeTruthy()
          expect(value.message).toBe(foo.message)
          break
      }
      count++
    })
  })
  it('can set values in another order', () => {
    // for another process of constructing
    mpt.set(catalyst, foo)
    mpt.set(catalog, bar)
    mpt.set(cat, meow)
    mpt.set(cattle, foo)
    mpt.set(category, bar)
    expect(Array.from(mpt)).toEqual([[cat, meow], [catalog, bar], [catalyst, foo], [category, bar], [cattle, foo]])
  })
  it('is hashable on root node', () => {
    mpt.set(cat, meow)
    const node = Leaf.construct(Key.bufferToKey(cat), meow)

    expect(mpt.root.equals(node.hash)).toBeTruthy()
    expect(mpt.hash.equals(node.hash)).toBeTruthy()
  })
  it('is deterministic', () => {
    const mpt1 = new MerklePatriciaTrie()
    mpt1.set(cat, meow)
    mpt1.set(catalyst, foo)
    mpt1.set(cattle, foo)

    const mpt2 = new MerklePatriciaTrie()
    mpt2.set(catalyst, meow)
    mpt2.set(catalog, bar)
    mpt2.delete(catalog)
    mpt2.set(cattle, foo)
    mpt2.set(catalyst, foo)
    mpt2.set(cat, meow)
    mpt2.delete(catalog)

    expect(mpt1.root.equals(mpt2.root)).toBeTruthy()
  })
})

// A little confusing
describe('Node normalizing', () => {
  const key = Key.bufferToKey(Buffer.from('cat'))
  const value = new Value('foo')
  let store: HashStore<Node<Value>>
  beforeEach(() => {
    store = new HashStore<Node<Value>>()
  })
  describe('Null', () => {
    it('construct null', () => {
      expect(Null.construct()).toBeInstanceOf(Null)
    })
  })
  describe('Leaf', () => {
    it('construct leaf', () => {
      const constructed = Leaf.construct(key, value)
      expect(constructed).toBeInstanceOf(Leaf)
      expect((constructed as Leaf<Value>).key).toEqual(key)
      expect((constructed as Leaf<Value>).value.message).toBe(value.message)
    })
  })
  describe('Extension', () => {
    it('construct null if ref to null', () => {
      expect(Extension.construct(store, key, Null.construct())).toBeInstanceOf(Null)
    })
    it('construct concatenated leaf if ref to leaf', () => {
      const leaf = Leaf.construct(key, value)
      expect(leaf).toBeInstanceOf(Leaf)
      const constructed = Extension.construct(store, key, leaf)
      expect(constructed).toBeInstanceOf(Leaf)
      expect((constructed as Leaf<Value>).key).toEqual([...key, ...key])
    })
    it('construct extension if ref to branch', () => {
      const branch = Branch.construct(store, new Array(16).fill(Leaf.construct(key, value)), Optional.none())
      expect(branch).toBeInstanceOf(Branch)
      const constructed = Extension.construct(store, key, branch)
      expect(constructed).toBeInstanceOf(Extension)
      expect(NodeRef.dereference(store, (constructed as Extension<Value>).ref)).toEqual(branch)
    })
    it('construct concatenated extension if ref to extension', () => {
      const extension = Extension.construct(store, key, Branch.construct(store, new Array(16).fill(Leaf.construct(key, value)), Optional.none()))
      expect(extension).toBeInstanceOf(Extension)
      const constructed = Extension.construct(store, key, extension)
      expect(constructed).toBeInstanceOf(Extension)
      expect((constructed as Extension<Value>).key).toEqual([...key, ...key])
    })
  })
  describe('Branch', () => {
    it('construct null if no branch and no value', () => {
      const constructed = Branch.construct(store, new Array(16).fill(Null.construct()), Optional.none())
      expect(constructed).toBeInstanceOf(Null)
    })
    it('construct leaf if no branch and has value', () => {
      const constructed = Branch.construct(store, new Array(16).fill(Null.construct()), Optional.some(value))
      expect(constructed).toBeInstanceOf(Leaf)
      expect((constructed as Leaf<Value>).key).toEqual([])
      expect((constructed as Leaf<Value>).value.message).toBe(value.message)
    })
    it('construct extension if one branch and no value', () => {
      const ref = Branch.construct(store, new Array(16).fill(Leaf.construct(key, value)), Optional.none())
      const extension = Extension.construct(store, key, ref)
      const constructed = Branch.construct(store, new Array(15).fill(Null.construct()).concat(extension), Optional.none())
      expect(constructed).toBeInstanceOf(Extension)
      expect((constructed as Extension<Value>).key).toEqual(['f', ...key])
      expect(NodeRef.dereference(store, (constructed as Extension<Value>).ref)).toEqual(ref)
    })
    it('construct branch when other case', () => {
      const branch = Branch.construct(store, new Array(15).fill(Null.construct()).concat(Leaf.construct(key, value)), Optional.some(value))
      expect(branch).toBeInstanceOf(Branch)
    })
  })
})
