/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { MerkleTree } from './merkle-tree'
import { Hash, Hashable } from '@uniqys/signature'
import { Serializable, BufferWriter, BufferReader, SizedBuffer, List, UInt8, serialize } from '@uniqys/serialize'

export enum TransactionType { Normal = 0, Event = 1 }
export class Transaction implements Hashable, Serializable {
  public readonly hash: Hash
  constructor (
    public readonly type: TransactionType,
    public readonly data: Buffer
  ) {
    this.hash = Hash.fromData(serialize(this))
  }
  public static deserialize (reader: BufferReader): Transaction {
    const type = UInt8.deserialize(reader)
    const data = SizedBuffer.deserialize(reader)
    return new Transaction(type, data)
  }
  public serialize (writer: BufferWriter) {
    UInt8.serialize(this.type, writer)
    SizedBuffer.serialize(this.data, writer)
  }
  public equals (other: Transaction) {
    return this.data.equals(other.data)
  }
}

export class TransactionList implements Hashable, Serializable, Iterable<Transaction> {
  public get hash () { return MerkleTree.root(this.transactions) }
  constructor (
    public readonly transactions: Transaction[]
  ) { }
  public static deserialize (reader: BufferReader): TransactionList {
    return new TransactionList(List.deserialize(Transaction.deserialize)(reader))
  }
  public serialize (writer: BufferWriter) {
    List.serialize<Transaction>((t, w) => t.serialize(w))(this.transactions, writer)
  }
  public [Symbol.iterator] (): Iterator<Transaction> {
    return this.transactions[Symbol.iterator]()
  }
}
