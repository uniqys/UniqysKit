import { Transaction } from './blockchain'
import { Hash } from '../cryptography'

export interface Core {
  sendTransaction (transaction: Transaction): void
}

export interface DappsConstructor<T extends Dapp> {
  new (core: Core): T
}

export interface Dapp {
  executeTransaction (transaction: Transaction): void
  getAppStateHash (): Hash
}
