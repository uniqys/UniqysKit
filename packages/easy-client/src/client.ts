/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import Axios, { AxiosInstance, AxiosRequestConfig, AxiosPromise } from 'axios'
import { Api } from './api'
import { Address, Signature } from '@uniqys/signature'
import { Transaction } from '@uniqys/easy-types'
import { adapter } from './adapter'

export interface Signer {
  address: Promise<Address>
  sign (tx: Transaction): Promise<Signature>
}

export interface RequestConfig extends AxiosRequestConfig {
  sign?: boolean
}

export class EasyClient {
  public readonly app: AxiosInstance
  public readonly api: Api
  constructor (
    private readonly signer: Signer,
    config?: AxiosRequestConfig
  ) {
    config = config || {}
    this.api = new Api(Axios.create(config))
    // add sign adapter
    config.adapter = adapter(signer, this.api)
    this.app = Axios.create(config)
  }

  public async getAddress (): Promise<Address> { return this.signer.address }

  // delegate
  public get defaults () { return this.app.defaults }
  public get interceptors () { return this.app.interceptors }
  public request<T = any> (config: RequestConfig): AxiosPromise<T> { return this.app.request(config) }
  public get<T = any> (url: string, config?: RequestConfig): AxiosPromise<T> { return this.app.get(url, config) }
  public delete (url: string, config?: RequestConfig): AxiosPromise<any> { return this.app.delete(url, config) }
  public head (url: string, config?: RequestConfig): AxiosPromise<any> { return this.app.head(url, config) }
  public post<T = any> (url: string, data?: any, config?: RequestConfig): AxiosPromise<T> { return this.app.post(url, data, config) }
  public put<T = any> (url: string, data?: any, config?: RequestConfig): AxiosPromise<T> { return this.app.put(url, data, config) }
  public patch<T = any> (url: string, data?: any, config?: RequestConfig): AxiosPromise<T> { return this.app.patch(url, data, config) }
}
