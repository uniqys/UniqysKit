import { Transaction } from '../chain-core/blockchain'
import { Hash } from '../cryptography'

export class AppState {
  constructor (
    public readonly height: number,
    public readonly hash: Hash
  ) {}
}

export interface Core {
  sendTransaction (transaction: Transaction): Promise<void>
}

export interface Dapp {
  connect (): Promise<AppState>
  execute (transactions: Transaction[]): Promise<AppState>
}
