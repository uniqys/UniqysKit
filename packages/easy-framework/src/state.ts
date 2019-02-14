/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Store, Namespace } from '@uniqys/store'
import { TrieStore, MerklePatriciaTrie } from '@uniqys/merkle-patricia-trie'
import { HttpResponse } from '@uniqys/easy-types'
import { Address, Hash } from '@uniqys/signature'
import { Account } from './account'
import { Optional } from '@uniqys/types'
import { UInt64, deserialize, serialize } from '@uniqys/serialize'
import { ReadWriteLock } from '@uniqys/lock'
import { Block, ValidatorSet, MerkleTree } from '@uniqys/blockchain'
import { AppState } from '@uniqys/dapp-interface'

namespace MetaKey {
  export const height = Buffer.from('height')
  export const latestBlockTimestamp = Buffer.from('latestBlockTimestamp') // timestamp of the latest block
  export const latestEventTimestamp = Buffer.from('latestEventTimestamp') // timestamp of the block which the latest event was included
  export const eventNonce = Buffer.from('eventNonce')
  export const eventTransactionRoot = Buffer.from('eventTransactionRoot')
  export const nextValidatorSet = Buffer.from('nextValidatorSet')
}
class MetaState {
  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) { }

  // height
  public async getHeight () {
    return (await this.store.get(MetaKey.height)).match(
      v => deserialize(v, UInt64.deserialize),
      () => 0
    )
  }
  public async incrementHeight () {
    const height = await this.getHeight()
    await this.store.set(MetaKey.height, serialize(height + 1, UInt64.serialize))
  }

  // latestBlockTimestamp
  public async getLatestBlockTimestamp () {
    return (await this.store.get(MetaKey.latestBlockTimestamp)).match(
      v => deserialize(v, UInt64.deserialize),
      () => 0
    )
  }
  public async setLatestBlockTimestamp (timestamp: number) {
    await this.store.set(MetaKey.latestBlockTimestamp, serialize(timestamp, UInt64.serialize))
  }

  // latestEventTimestamp
  public async getLatestEventTimestamp () {
    return (await this.store.get(MetaKey.latestEventTimestamp)).match(
      v => deserialize(v, UInt64.deserialize),
      () => 0
    )
  }
  public async setLatestEventTimestamp (timestamp: number) {
    await this.store.set(MetaKey.latestEventTimestamp, serialize(timestamp, UInt64.serialize))
  }

  // eventNonce
  public async getEventNonce (): Promise<number> {
    return (await this.store.get(MetaKey.eventNonce)).match(
      v => deserialize(v, UInt64.deserialize),
      () => 0
    )
  }
  public async incrementEventNonce () {
    const nonce = await this.getEventNonce()
    await this.store.set(MetaKey.eventNonce, serialize(nonce + 1, UInt64.serialize))
  }

  // eventTransactionRoot
  public async getEventTransactionRoot (): Promise<Hash> {
    return (await this.store.get(MetaKey.eventTransactionRoot)).match(
      v => deserialize(v, Hash.deserialize),
      () => MerkleTree.root([])
    )
  }
  public async setEventTransactionRoot (eventTransactionRoot: Hash) {
    await this.store.set(MetaKey.eventTransactionRoot, serialize(eventTransactionRoot))
  }

  // nextValidatorSet
  public async getNextValidatorSet (): Promise<ValidatorSet> {
    return (await this.store.get(MetaKey.nextValidatorSet)).match(
      v => deserialize(v, ValidatorSet.deserialize),
      () => new ValidatorSet([])
    )
  }
  public async setNextValidatorSet (nextValidatorSet: ValidatorSet) {
    await this.store.set(MetaKey.nextValidatorSet, serialize(nextValidatorSet))
  }
}

export class TransactionResult {
  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) {}

  public async set (tx: Hash, response: HttpResponse) {
    await this.store.set(tx.buffer, serialize(response))
  }

  public async get (tx: Hash): Promise<Optional<HttpResponse>> {
    return (await this.store.get(tx.buffer)).match(
      b => Optional.some(deserialize(b, HttpResponse.deserialize)),
      () => Optional.none()
    )
  }
}

export class State {
  public readonly meta: MetaState
  public readonly result: TransactionResult
  public readonly top: MerklePatriciaTrie
  public readonly app: Store<Buffer, Buffer>
  public readonly rwLock: ReadWriteLock

  constructor (
    private readonly store: Store<Buffer, Buffer>,
    private readonly genesisBlock: Block,
    private readonly initialValidatorSet: ValidatorSet
  ) {
    this.meta = new MetaState(new Namespace(this.store, 'meta:'))
    this.result = new TransactionResult(new Namespace(this.store, 'results:'))
    this.top = new MerklePatriciaTrie(new TrieStore(new Namespace(this.store, 'app:')))
    this.app = new Namespace(this.top, Address.zero.buffer)
    this.rwLock = new ReadWriteLock()
  }
  public async ready (): Promise<void> {
    if (await this.meta.getLatestBlockTimestamp() === 0) {
      await this.meta.setLatestBlockTimestamp(this.genesisBlock.header.timestamp)
    }
    if (await this.meta.getLatestEventTimestamp() === 0) {
      await this.meta.setLatestEventTimestamp(this.genesisBlock.header.timestamp)
    }
    if ((await this.meta.getNextValidatorSet()).validators.length === 0) {
      await this.meta.setNextValidatorSet(this.initialValidatorSet)
    }
    await this.top.ready()
  }
  public async getAppState (): Promise<AppState> {
    return new AppState(
      await this.meta.getHeight(),
      this.top.root,
      await this.meta.getNextValidatorSet(),
      await this.meta.getEventTransactionRoot()
    )
  }
  public async getAccount (address: Address): Promise<Account> {
    return (await this.top.get(address.buffer)).match(
        v => deserialize(v, Account.deserialize),
        () => Account.default
    )
  }
  public async setAccount (address: Address, account: Account): Promise<void> {
    await this.top.set(address.buffer, serialize(account))
  }
}
