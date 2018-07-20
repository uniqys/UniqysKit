import { Gateway } from './gateway'
import { OuterApi, InnerApi } from './api'
import { MemcachedCompatibleServer } from './memcached-compatible-server'
import { Controller } from './controller'
import { State } from './state'
import { Node } from '@uniqys/chain-core'
import { Store } from '@uniqys/store'
import Koa from 'koa'
import Router from 'koa-router'
import { URL } from 'url'
import net from 'net'
import http from 'http'

export class Easy {
  public readonly node: Node<Controller>
  public readonly controller: Controller
  private readonly state: State
  constructor (
    private readonly app: URL,
    store: Store<Buffer, Buffer>,
    node: (dapp: Controller) => Node<Controller>
  ) {
    this.state = new State(store)
    this.controller = new Controller(app, this.state)
    this.node = node(this.controller)
  }
  public async start () {
    await this.node.start()
  }

  public gateway (): http.Server { return new Gateway(this.node, this.state, new OuterApi(this.state), this.app) }
  public innerApi (): http.Server { return this._serveApi(new InnerApi(this.state)) }
  public innerMemcachedCompatible (): net.Server { return new MemcachedCompatibleServer(this.state.app) }

  private _serveApi (api: Router): http.Server {
    return http.createServer(new Koa()
      .use(api.routes())
      .use(api.allowedMethods())
      .callback()
    )
  }
}
