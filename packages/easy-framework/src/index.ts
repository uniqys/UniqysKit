/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { ChainCore, ChainCoreOptions } from '@uniqys/chain-core'
import { Store } from '@uniqys/store'
import { Blockchain } from '@uniqys/blockchain'
import { KeyPair } from '@uniqys/signature'
import { AsyncLoop } from '@uniqys/async-loop'
import { Gateway } from './gateway'
import { OuterApi, InnerApi } from './api'
import { MemcachedCompatibleServer } from './memcached-compatible-server'
import { Controller } from './controller'
import { State } from './state'
import PeerInfo from 'peer-info'
import Koa from 'koa'
import Router from 'koa-router'
import { URL } from 'url'
import net from 'net'
import http from 'http'
import { EasyMemcached } from './memcached-implementation'
import debug from 'debug'
const logger = debug('easy-fw')

export interface ListenOptions {
  /**
   * port number
   *
   * @TJS-type integer
   */
  port: number
  /**
   * host name
   */
  host: string
}
export interface EasyOptions {
  gateway: ListenOptions
  innerApi: ListenOptions
  innerMemcached: ListenOptions
  app: ListenOptions
  appStartTimeout: number
}
export namespace EasyOptions {
  export const defaults: EasyOptions = {
    gateway: { port: 8080, host: '0.0.0.0' },
    innerApi: { port: 5651, host: '127.0.0.1' },
    innerMemcached: { port: 5652, host: '127.0.0.1' },
    app: { port: 5650, host: '127.0.0.1' },
    appStartTimeout: 5000
  }
}
export interface Options extends ChainCoreOptions {
  easy: Partial<EasyOptions>
}
export namespace Options {
  export const defaults: Options = Object.assign(ChainCoreOptions.defaults, {
    easy: {}
  })
}

export class Easy {
  public readonly options: EasyOptions
  public readonly gateway: http.Server
  public readonly innerApi: http.Server
  public readonly innerMemcached: net.Server
  private readonly core: ChainCore
  constructor (
    blockchain: Blockchain,
    stateStore: Store<Buffer, Buffer>,
    peerInfo: PeerInfo,
    keyPair?: KeyPair,
    options?: Partial<Options>
  ) {
    this.options = Object.assign({}, EasyOptions.defaults, Object.assign({}, Options.defaults, options).easy)
    const appUrl = new URL(`http://${this.options.app.host}:${this.options.app.port}`)
    const state = new State(stateStore)
    const memcachedImpl = new EasyMemcached(state.app)
    const controller = new Controller(appUrl, state, memcachedImpl)
    this.core = new ChainCore(controller, blockchain, peerInfo, keyPair, options)
    this.gateway = new Gateway(this.core, state, new OuterApi(state), appUrl)
    this.innerApi = Easy.serveApi(new InnerApi(state))
    this.innerMemcached = new MemcachedCompatibleServer(memcachedImpl)
  }
  public async listen () {
    await Promise.all([
      Easy.listen(this.gateway, this.options.gateway),
      Easy.listen(this.innerApi, this.options.innerApi),
      Easy.listen(this.innerMemcached, this.options.innerMemcached)
    ])
    logger('listen gateway: %s', Easy.listenedAddressToString(this.gateway))
    logger('listen inner API: %s', Easy.listenedAddressToString(this.innerApi))
    logger('listen inner Memcached: %s', Easy.listenedAddressToString(this.innerMemcached))
  }
  public async start () {
    await this.waitApp()
    await this.core.start()
    logger('started')
  }
  public async stop () {
    await this.core.stop()
    logger('stopped')
  }
  public async close () {
    await Promise.all([
      Easy.close(this.gateway),
      Easy.close(this.innerApi),
      Easy.close(this.innerMemcached)
    ])
    logger('close gateway')
    logger('close inner API')
    logger('close inner Memcached')
  }
  private static serveApi (api: Router): http.Server {
    return http.createServer(new Koa()
      .use(api.routes())
      .use(api.allowedMethods())
      .callback()
    )
  }
  private static listenedAddressToString (server: net.Server) {
    const addr = server.address()
    return typeof addr === 'string' ? addr : `${addr.address}:${addr.port}`
  }
  private static async listen (server: net.Server, options: ListenOptions): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      server.listen(options)
      server.once('listening', resolve)
      server.once('error', reject)
    })
  }
  private static async close (server: net.Server): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      server.close()
      server.once('close', resolve)
      server.once('error', reject)
    })
  }
  private async waitApp (): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const loop = new AsyncLoop(async () => {
        const connectable = await new Promise((resolve => {
          const socket = new net.Socket()
          const notConnected = () => {
            socket.destroy()
            resolve(false)
          }
          socket.setTimeout(500, notConnected)
          socket.on('error', notConnected)
          socket.connect(this.options.app.port, this.options.app.host, () => {
            socket.end()
            resolve(true)
          })
        }))
        if (connectable) {
          loop.stop()
        }
      })
      loop.start()
      setTimeout(() => {
        reject(new Error('app start wait timeout'))
      }, this.options.appStartTimeout)
      loop.on('end', resolve)
    })
  }
}
