import Koa from 'koa'
import Router from 'koa-router'
import http from 'http'
import { Core } from '../../interface/dapi'
import { State } from './state'
import { URL } from 'url'
import { SignedRequest } from './packer'
import { Transaction as CoreTransaction } from '../../structure/blockchain/transaction'
import { serialize } from '../../structure/serializable'
import { OuterApi } from './api'

export class Gateway extends http.Server {
  constructor (
    core: Core,
    state: State,
    api: OuterApi,
    app: URL
  ) {
    const koa = new Koa()
      .use(new Router()
        .use('/uniqys', api.routes(), api.allowedMethods())
        .routes()
      )
      .use(async (ctx, next) => {
        if (ctx.headers['uniqys-sign']) {
          const tx = await SignedRequest.pack(ctx.req, app)
          const coreTx = new CoreTransaction(serialize(tx))
          await core.sendTransaction(coreTx)
          ctx.status = 202 // Accepted
          ctx.body = {
            id: coreTx.hash.toHexString()
          }
        } else {
          await next()
        }
      })
      .use(async (ctx, next) => {
        ctx.assert(!ctx.headers['uniqys-sender'], 403)
        await next()
      })
      .use(async (ctx, _next) => {
        ctx.respond = false
        // proxy
        await state.pure(() => new Promise((resolve, reject) => {
          const req = http.request({
            protocol: app.protocol,
            host: app.hostname,
            port: app.port,
            method: ctx.method,
            path: ctx.path,
            headers: ctx.headers
          }, res => {
            ctx.res.writeHead(res.statusCode!, res.statusMessage, res.headers)
            res.pipe(ctx.res)
            resolve()
          })
          req.on('error', reject)
          ctx.req.pipe(req)
        }))
      })
    super(koa.callback())
  }
}
