/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { AxiosInstance, AxiosPromise } from 'axios'

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
}
