import { Transaction } from 'chain-core/blockchain'
import { Hash } from 'cryptography'

export interface Core {
  sendTransaction (transaction: Transaction): void
}

export interface DappsConstructor {
  new (core: Core): Dapps
}

export interface Dapps {
  executeTransaction (transaction: Transaction): void
  getAppStateHash (): Hash
}
