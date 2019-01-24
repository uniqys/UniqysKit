/*
  Copyright 2018 Bit Factory, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import { EventLog } from 'web3/types'
import Koa from 'koa'
import Router from 'koa-router'
import BodyParser from 'koa-bodyparser'
import KoaLogger from 'koa-logger'
import KoaStatic from 'koa-static'
import axios from 'axios'
import debug from 'debug'
const logger = debug('app')

function viaChain (ctx: Koa.Context): string {
  const sender = ctx.header['uniqys-sender']
  console.log(sender)
  if (!(sender && typeof sender === 'string')) ctx.throw(403, 'access via chain required')
  return sender
}

export class App extends Koa {
  constructor (apiUrl: string) {
    const api = axios.create({
      baseURL: `http://${apiUrl}`
    })
    const router = new Router()
      // Event Txs
      .post('/uniqys/eth', BodyParser(), async (ctx) => {
        const eventLog = ctx.request.body as EventLog
        logger('received %s event from Ethereum', eventLog.event)
        if (eventLog.event === 'Deposit') {
          const { account, value } = eventLog.returnValues as { account: string, value: string }
          const balance = (await api.get(`/accounts/${account.substr(2)}/balance`)).data[0]
          await api.put(`/accounts/${account.substr(2)}/balance`, [balance + parseInt(value, 10)])
        }
        ctx.status = 200
      })
      // Normal Txs
      .post('/transfer', BodyParser(), async (ctx) => {
        logger(ctx)
        const sender = viaChain(ctx)
        const { to, value } = ctx.request.body as { to: string, value: number }
        logger('transfer %d from %s to %s', value, sender, to)
        await api.post(`/accounts/${sender}/transfer`, { to, value })
        ctx.status = 200
      })

    super()
    this.use(KoaLogger())
      .use(KoaStatic('./node_modules/@uniqys/easy-client/lib/'))
      .use(KoaStatic('./static/'))
      .use(router.routes())
      .use(router.allowedMethods())
  }
}
