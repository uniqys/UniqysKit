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
import Memcached from 'memcached'
import debug from 'debug'
const logger = debug('app')

interface WithdrawTxInfo {
  txHash: string,
  height: number,
  value: number
}

function viaChain (ctx: Koa.Context): string {
  const sender = ctx.header['uniqys-sender']
  if (!(sender && typeof sender === 'string')) ctx.throw(403, 'access via chain required')
  return sender
}

export class App extends Koa {
  constructor (apiUrl: string, dbUrl: string) {
    const api = axios.create({
      baseURL: `http://${apiUrl}`
    })
    const db = new Memcached(dbUrl)
    const router = new Router()
      // Event Txs
      .post('/uniqys/eth', BodyParser(), async (ctx) => {
        const eventLog = ctx.request.body as EventLog
        logger('received %s event from Ethereum', eventLog.event)
        if (eventLog.event === 'Deposit') {
          const { account, value } = eventLog.returnValues as { account: string, value: string }
          const balance = (await api.get(`/accounts/${account.substr(2)}/balance`)).data[0]
          await api.put(`/accounts/${account.substr(2)}/balance`, [balance + parseInt(value, 10)])
        } else if (eventLog.event === 'Withdraw') {
          const { account, txHash } = eventLog.returnValues as { account: string, txHash: string }
          // remove from withdrawable
          const withdrawable = await new Promise<WithdrawTxInfo[]>((resolve, reject) => {
            db.get(`withdrawable:${account.substr(2)}`, (err, result) => {
              if (err) return reject(err)
              if (result === undefined) return resolve([])
              return resolve(result)
            })
          })
          const newWithdrawable = withdrawable.filter(txInfo => txInfo.txHash !== txHash)
          await new Promise<void>((resolve, reject) => {
            db.set(`withdrawable:${account.substr(2)}`, newWithdrawable, 0, (err) => {
              if (err) return reject(err)
              resolve()
            })
          })
        } else if (eventLog.event === 'StakeUpdate') {
          const { account, power } = eventLog.returnValues as { account: string, power: number }
          const address = account.substr(2)
          const validators = (await api.get('/validators/next')).data as { address: string, power: number }[]
          const newValidators = validators.filter((v) => v.address.toLowerCase() !== address.toLowerCase())
          if (power > 0) {
            newValidators.push({ address, power })
          }
          await api.put('/validators', newValidators)
        }
        ctx.status = 200
      })
      // Normal Txs
      .get('/withdrawable/:address', async (ctx) => {
        const address = ctx.params.address
        const withdrawable = await new Promise<WithdrawTxInfo[]>((resolve, reject) => {
          db.get(`withdrawable:${address}`, (err, result) => {
            if (err) return reject(err)
            if (result === undefined) return resolve([])
            return resolve(result)
          })
        })
        ctx.body = withdrawable
      })
      .post('/transfer', BodyParser(), async (ctx) => {
        const sender = viaChain(ctx)
        const { to, value } = ctx.request.body as { to: string, value: number }
        logger('transfer %d from %s to %s', value, sender, to)
        await api.post(`/accounts/${sender}/transfer`, { to, value })
        ctx.status = 200
      })
      .post('/withdraw', BodyParser({ enableTypes: ['text'] }), async (ctx) => {
        const sender = viaChain(ctx)
        const value = ctx.request.body as number
        logger('withdraw %d from %s', value, sender)
        const balance = (await api.get(`/accounts/${sender}/balance`)).data[0]
        await api.put(`/accounts/${sender}/balance`, [balance - value])

        // add to withdrawable
        const withdrawable = await new Promise<WithdrawTxInfo[]>((resolve, reject) => {
          db.get(`withdrawable:${sender}`, (err, result) => {
            if (err) return reject(err)
            if (result === undefined) return resolve([])
            return resolve(result)
          })
        })
        const txHash = ctx.header['uniqys-txhash']
        const height = parseInt(ctx.header['uniqys-blockheight'], 10) + 1 // Consented in next block
        withdrawable.push({ txHash: txHash, height: height, value: value })
        await new Promise<void>((resolve, reject) => {
          db.set(`withdrawable:${sender}`, withdrawable, 0, (err) => {
            if (err) return reject(err)
            resolve()
          })
        })

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
