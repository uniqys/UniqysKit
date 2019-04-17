/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import path from 'path'
import * as dapi from '@uniqys/dapp-interface'
import { Transaction as CoreTransaction, TransactionType } from '@uniqys/blockchain'
import { serialize } from '@uniqys/serialize'
import { Transaction, HttpRequest, HttpHeaders } from '@uniqys/easy-types'
import Web3 from 'web3'
import { EventLog } from 'web3/types'
import Contract from 'web3/eth/contract'

export interface EthereumOptions {
  providerEndPoint: string,
  confirmationTime: number,
  artifactPath: string
}
export namespace EthereumOptions {
  export const defaults: EthereumOptions = {
    providerEndPoint: 'http://localhost:7545',
    confirmationTime: 1500,
    artifactPath: ''
  }
}

export default class EthereumSideChain implements dapi.EventProvider {
  public readonly ethOptions: EthereumOptions
  public readonly web3: Web3
  public contract?: Contract = undefined

  constructor (dappConfDir: string, options: EthereumOptions) {
    this.ethOptions = Object.assign({}, EthereumOptions.defaults, options)
    this.ethOptions.artifactPath = path.resolve(dappConfDir, this.ethOptions.artifactPath)
    this.web3 = new Web3(this.ethOptions.providerEndPoint)
  }

  public async ready () {
    const artifact = require(this.ethOptions.artifactPath)
    const netId = await this.web3.eth.net.getId()
    this.contract = new this.web3.eth.Contract(artifact.abi, artifact.networks[netId].address)
  }

  public async getTransactions (fromTimestamp: number, toTimestamp: number, nonce: number): Promise<CoreTransaction[]> {
    if (!this.contract) { return [] }
    const fromBlock = await this.blockLowerBound(fromTimestamp - this.ethOptions.confirmationTime)
    const toBlock = await this.blockLowerBound(toTimestamp - this.ethOptions.confirmationTime) - 1
    if (fromBlock > toBlock) { return [] }
    const events = await this.contract.getPastEvents('allEvents', {
      fromBlock: fromBlock,
      toBlock: toBlock
    })
    const txs: CoreTransaction[] = []
    events.forEach(event => {
      txs.push(this.pack(event, nonce))
      nonce++
    })
    return txs
  }

  private pack (event: EventLog, nonce: number): CoreTransaction {
    const body = JSON.stringify(event)
    const header = new HttpHeaders([['content-type', 'application/json']])
    const request = new HttpRequest('POST', '/eth', header, Buffer.from(body))
    const tx = new Transaction(nonce, request)
    return new CoreTransaction(TransactionType.Event, serialize(tx))
  }

  private async blockLowerBound (timestamp: number): Promise<number> {
    let left = 0
    let right = await this.web3.eth.getBlockNumber()
    while (left <= right) {
      let middle = Math.floor((left + right) / 2)
      if ((await this.web3.eth.getBlock(middle)).timestamp < timestamp) left = middle + 1
      else right = middle - 1
    }
    return left
  }
}
