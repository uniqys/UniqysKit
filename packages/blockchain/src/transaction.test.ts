/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Transaction, TransactionList, TransactionType } from './transaction'
import { MerkleTree } from './merkle-tree'
import { Hash } from '@uniqys/signature'
import { serialize, deserialize, SizedBuffer, UInt8 } from '@uniqys/serialize'

describe('transaction', () => {
  it('is serializable', () => {
    const transaction = new Transaction(TransactionType.Normal, Buffer.from('The quick brown fox jumps over the lazy dog'))
    expect(deserialize(serialize(transaction), Transaction.deserialize).equals(transaction)).toBeTruthy()
  })
  it('is hashable', () => {
    const transaction = new Transaction(TransactionType.Normal, Buffer.from('foo'))
    const hash = Hash.fromData(
      Buffer.concat([
        serialize(TransactionType.Normal, UInt8.serialize),
        serialize(Buffer.from('foo'), SizedBuffer.serialize)
      ])
      )
    expect(transaction.hash.equals(hash)).toBeTruthy()
  })
})

describe('transaction list', () => {
  let transaction1: Transaction
  let transaction2: Transaction
  beforeAll(() => {
    transaction1 = new Transaction(TransactionType.Normal, Buffer.from('transaction1'))
    transaction2 = new Transaction(TransactionType.Normal, Buffer.from('transaction2'))
  })
  it('has merkle root', () => {
    const list = new TransactionList([transaction1, transaction2])
    expect(list.hash.equals(MerkleTree.root([transaction1, transaction2]))).toBeTruthy()
    expect(deserialize(serialize(list), TransactionList.deserialize).hash.equals(list.hash)).toBeTruthy()
  })
  it('is serializable', () => {
    const list = new TransactionList([transaction1, transaction2])
    expect(deserialize(serialize(list), TransactionList.deserialize).hash.equals(list.hash)).toBeTruthy()
  })
})
