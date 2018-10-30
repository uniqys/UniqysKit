/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { TrieStore } from './trie-store'
import { Node } from './node'
import { Hash } from '@uniqys/signature'
import { InMemoryStore } from '@uniqys/store'

describe('trie node store', () => {
  let store: TrieStore
  let hash: Hash
  let node: Node
  beforeAll(() => {
    hash = Hash.fromData('foo')
    node = Node.null
  })
  beforeEach(() => {
    store = new TrieStore(new InMemoryStore())
  })
  it('set and get node by hash', async () => {
    await store.set(hash, node)
    expect(await store.get(hash)).toEqual(node)
  })
  it('throw error if not exists', async () => {
    await expect(store.get(hash)).rejects.toThrow()
  })
  it('set and get root hash', async () => {
    await store.setRoot(hash)
    expect(await store.getRoot()).toEqual(hash)
  })
  it('does not throw error if not exists', async () => {
    expect(await store.getRoot()).toBeUndefined()
  })
})
