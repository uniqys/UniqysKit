/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { BlockStore } from './block-store'
import { InMemoryStore } from '@uniqys/store'
import { Block } from './block'
import { Hash } from '@uniqys/signature'
import { TransactionList } from './transaction'
import { Consensus, Vote, ValidatorSet } from './consensus'

describe('block store', () => {
  let block: Block
  let store: BlockStore
  beforeAll(() => {
    block = Block.construct(1, 100, Hash.fromData('genesis'), Hash.fromData('validators'), Hash.fromData('state'),
        new TransactionList([]), new Consensus(new Vote(0, 1, Hash.fromData('genesis')), []))
  })
  beforeEach(() => {
    store = new BlockStore(new InMemoryStore())
  })
  it('initial height is 0', async () => {
    expect(await store.getHeight()).toBe(0)
  })
  it('set and get height', async () => {
    await store.setHeight(10)
    expect(await store.getHeight()).toBe(10)
    // clear cache
    const newStore = new BlockStore(store['store'])
    expect(await newStore.getHeight()).toBe(10)
  })
  it('set and get last consensus', async () => {
    await store.setLastConsensus(block.body.lastBlockConsensus)
    expect(await store.getLastConsensus()).toEqual(block.body.lastBlockConsensus)
  })
  it('set and get header of height', async () => {
    await store.setHeader(2, block.header)
    expect(await store.getHeader(2)).toEqual(block.header)
  })
  it('set and get body of height', async () => {
    await store.setBody(2, block.body)
    expect(await store.getBody(2)).toEqual(block.body)
  })
  it('set and get validator set of height', async () => {
    const validatorSet = new ValidatorSet([])
    await store.setValidatorSet(validatorSet)
    expect(await store.getValidatorSet(validatorSet.hash)).toEqual(validatorSet)
  })
  it('throw if not stored', async () => {
    await expect(store.getHeader(1)).rejects.toThrow()
    await expect(store.getBody(1)).rejects.toThrow()
    await expect(store.getLastConsensus()).rejects.toThrow()
  })
})
