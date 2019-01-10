/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import * as dapi from '@uniqys/dapp-interface'
import { Transaction, HttpRequest } from '@uniqys/easy-types'
import { serialize } from '@uniqys/serialize'
import { Transaction as CoreTransaction, TransactionType } from '@uniqys/blockchain'

const EVENT_EVERY_SEC = 15

export default class TimestampEventProvider implements dapi.EventProvider {
  public async getTransactions (fromTimestamp: number, toTimestamp: number, nonce: number): Promise<CoreTransaction[]> {
    const eventTxs: CoreTransaction[] = []
    let candidate = EVENT_EVERY_SEC * (fromTimestamp / EVENT_EVERY_SEC + 1)
    while (candidate <= toTimestamp) {
      nonce++
      eventTxs.push(this.pack(candidate, nonce))
      candidate += EVENT_EVERY_SEC
    }
    return eventTxs
  }

  private pack (data: number, nonce: number): CoreTransaction {
    const body = JSON.stringify({
      timestamp: data
    })
    const request = new HttpRequest('POST', '/event', undefined, Buffer.from(body))
    const tx = new Transaction(nonce, request)
    return new CoreTransaction(TransactionType.Event, serialize(tx))
  }
}
