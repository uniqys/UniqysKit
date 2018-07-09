import semaphore from 'semaphore'
import { takeSemaphoreAsync } from '../../utility/semaphore'
import { deserialize, UInt64, serialize } from '../../structure/serializable'
import { Store, Namespace } from '../../store/common'
import { Hash } from '../../structure/cryptography'
import { Optional } from '../../structure/optional'
import { AppState } from '../../interface/dapi'
import { TrieStore } from '../../store/trie'
import { MerklePatriciaTrie } from '../../structure/merkle-patricia-trie'
import { Address } from '../../structure/address'
import { Account } from './account'
import { HttpResponse } from '../structure/http-message'

namespace MetaKey {
  export const height = Buffer.from('height')
}
class MetaState {
  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) { }

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
  private readonly semaphore: semaphore.Semaphore

  constructor (
    private readonly store: Store<Buffer, Buffer>
  ) {
    this.meta = new MetaState(new Namespace(this.store, 'meta:'))
    this.result = new TransactionResult(new Namespace(this.store, 'results:'))
    this.top = new MerklePatriciaTrie(new TrieStore(new Namespace(this.store, 'app:')))
    this.app = new Namespace(this.top, Address.zero.buffer)
    this.semaphore = semaphore(1)
  }
  public async ready (): Promise<void> {
    await this.top.ready()
  }
  public lock<T> (task: () => Promise<T>): Promise<T> {
    return takeSemaphoreAsync(this.semaphore, task)
  }
  public async appState (): Promise<AppState> {
    const root = this.top.root
    const height = await this.meta.getHeight()
    return new AppState(height, root)
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
  public async pure<T> (task: () => Promise<T>): Promise<T> {
    const root = this.top.root
    return task().finally(() => this.top.rollback(root))
  }
}
