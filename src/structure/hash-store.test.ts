import { HashStore } from './hash-store'
import { Hashable, Hash } from './cryptography'

class Value implements Hashable {
  hash: Hash
  constructor (
    public readonly message: string
  ) {
    this.hash = Hash.fromData(message)
  }
}

function entries<T extends Hashable> (store: HashStore<T>): [Hash, T][] {
  let entries = []
  for (const entry of store) { entries.push(entry) }
  return entries
}
function keys<T extends Hashable> (store: HashStore<T>): Hash[] {
  let keys = []
  for (const key of store.keys()) { keys.push(key) }
  return keys
}
function values<T extends Hashable> (store: HashStore<T>): T[] {
  let values = []
  for (const value of store.values()) { values.push(value) }
  return values
}

describe('Hash Store', () => {
  const foo = new Value('foo')
  const bar = new Value('bar')
  const buzz = new Value('buzz')

  let store: HashStore<Value>
  beforeEach(() => {
    store = new HashStore()
  })

  it('can set value and get by hash', () => {
    store.set(foo)
    store.set(bar)
    expect(store.size).toBe(2)
    expect(store.get(foo.hash)!.message).toBe(foo.message)
    expect(store.get(bar.hash)!.message).toBe(bar.message)
  })
  it('can check contain hash', () => {
    store.set(foo)
    expect(store.has(foo.hash)).toBeTruthy()
    expect(store.has(bar.hash)).not.toBeTruthy()
  })
  it('can delete a value', () => {
    store.set(foo)
    store.delete(foo)
    expect(store.size).toBe(0)
    expect(store.get(foo.hash)).toBeUndefined()
  })
  it('can clear values', () => {
    store.set(foo)
    store.set(bar)
    store.clear()
    expect(store.size).toBe(0)
    expect(store.get(foo.hash)).toBeUndefined()
    expect(store.get(bar.hash)).toBeUndefined()
  })
  it('iterate key-values', () => {
    store.set(foo)
    store.set(bar)
    store.set(buzz)
    expect(new Set(entries(store))).toEqual(new Set([[foo.hash, foo], [bar.hash, bar], [buzz.hash, buzz]]))
    expect(new Set(keys(store))).toEqual(new Set([foo.hash, bar.hash, buzz.hash]))
    expect(new Set(values(store))).toEqual(new Set([foo, bar, buzz]))
    let set = new Set()
    store.forEach((value, key) => { set.add([key, value]) })
    expect(set).toEqual(new Set([[foo.hash, foo], [bar.hash, bar], [buzz.hash, buzz]]))
  })
})
