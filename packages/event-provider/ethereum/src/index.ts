/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import path from 'path'
import * as dapi from '@uniqys/dapp-interface'
import { Transaction as CoreTransaction, TransactionType, Validator, ValidatorSet } from '@uniqys/blockchain'
import { serialize } from '@uniqys/serialize'
import { Transaction, EventTransaction, HttpRequest, HttpHeaders } from '@uniqys/easy-types'
import { Address } from '@uniqys/signature'
import Web3 from 'web3'
import { EventLog } from 'web3/types'
import Contract from 'web3/eth/contract'

export interface EthOptions {
  providerEndPoint: string,
  confirmationTime: number,
  artifactPath: string
}
export namespace EthOptions {
  export const defaults: EthOptions = {
    providerEndPoint: 'http://localhost:7545',
    confirmationTime: 1500,
    artifactPath: ''
  }
}

interface StakeUpdateEvent {
  account: string,
  power: number
}

export default class EthCrossChain implements dapi.EventProvider {
  public readonly ethOptions: EthOptions
  public readonly web3: Web3
  public contract?: Contract = undefined

  constructor (dappConfDir: string, options: EthOptions) {
    this.ethOptions = Object.assign({}, EthOptions.defaults, options)
    this.ethOptions.artifactPath = path.resolve(dappConfDir, this.ethOptions.artifactPath)
    this.web3 = new Web3(this.ethOptions.providerEndPoint)
  }

  public async ready () {
    const artifact = require(this.ethOptions.artifactPath)
    const netId = await this.web3.eth.net.getId()
    this.contract = new this.web3.eth.Contract(artifact.abi, artifact.networks[netId].address)
  }

  public async getTransactions (fromTimestamp: number, toTimestamp: number, nonce: number, validatorSet: ValidatorSet): Promise<CoreTransaction[]> {
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
      if (event.event === 'StakeUpdate') {
        const data = event.returnValues as StakeUpdateEvent
        const address = Address.fromString(data.account.substr(2))
        let validators = validatorSet.validators
        const index = validators.findIndex(v => v.address.equals(address))
        if (index === -1 && data.power > 0) {
          validators.push(new Validator(address, data.power))
        } else {
          if (data.power > 0) {
            validators[index] = new Validator(address, data.power)
          } else {
            validators = validators.splice(index, 1)
          }
        }
        validatorSet = new ValidatorSet(validators)
      }
      txs.push(this.pack(event, nonce, validatorSet))
      nonce++
    })
    return txs
  }

  private pack (event: EventLog, nonce: number, validatorSet: ValidatorSet): CoreTransaction {
    const body = JSON.stringify(event)
    const header = new HttpHeaders([['content-type', 'application/json']])
    const request = new HttpRequest('POST', '/eth', header, Buffer.from(body))
    const tx = new EventTransaction(validatorSet, new Transaction(nonce, request))
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
