/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Transaction } from '@uniqys/blockchain'
import { Hash } from '@uniqys/signature'

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
  validateTransaction (transaction: Transaction): Promise<boolean>
  selectTransactions (transactions: Transaction[]): Promise<Transaction[]>
  executeTransactions (transactions: Transaction[]): Promise<AppState>
}
