/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { AxiosInstance, AxiosPromise } from 'axios'

export interface BlockHeader {
  height: number,
  timestamp: number,
  lastBlockHash: string,
  transactionRoot: string,
  lastBlockConsensusRoot: string,
  nextValidatorSetRoot: string,
  appStateHash: string
}

export interface BlockBody {
  transactions: string[],
  consensus: {
    height: number,
    round: number,
    blockHash: string,
    signatures: string[]
  }
}

export interface Block {
  header: BlockHeader,
  body: BlockBody,
  hash: string
}

export class Api {
  constructor (
    private readonly client: AxiosInstance
  ) {}

  public async account (address: string): Promise<{ nonce: number, balance: number }> {
    return (await this.client.get(`/uniqys/accounts/${address}`)).data
  }
  public async nonce (address: string): Promise<number> {
    return (await this.client.get(`/uniqys/accounts/${address}/nonce`)).data[0]
  }
  public async balance (address: string): Promise<number> {
    return (await this.client.get(`/uniqys/accounts/${address}/balance`)).data[0]
  }
  public awaiting<T = any> (id: string): AxiosPromise<T> {
    return this.client.get(`/uniqys/awaiting/${id}`)
  }
  public async height (): Promise<number> {
    return (await this.client.get('/uniqys/height')).data[0]
  }
  public async block (height: number): Promise<Block> {
    return (await this.client.get(`/uniqys/block/${height}`)).data
  }
  public async blockHeader (height: number): Promise<BlockHeader> {
    return (await this.client.get(`/uniqys/block/${height}/header`)).data
  }
  public async blockBody (height: number): Promise<BlockBody> {
    return (await this.client.get(`/uniqys/block/${height}/body`)).data
  }
  public async blockHash (height: number): Promise<string> {
    return (await this.client.get(`/uniqys/block/${height}/hash`)).data[0]
  }
  public async transaction (txHash: string): Promise<string> {
    return (await this.client.get(`/uniqys/transaction/${txHash}`)).data[0]
  }
  public async transactionProof (txHash: string): Promise<string[]> {
    return (await this.client.get(`/uniqys/transaction/${txHash}/proof`)).data
  }
}
