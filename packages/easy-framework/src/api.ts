/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import Router from 'koa-router'
import BodyParser from 'koa-bodyparser'
import { State } from './state'
import { Address, Hash } from '@uniqys/signature'
import { Mutex } from '@uniqys/lock'
import { Blockchain, BlockHeader, BlockBody, Consensus } from '@uniqys/blockchain'
import { serialize } from '@uniqys/serialize'

function maybeHash (str: string): Hash | undefined {
  try { return Hash.fromHexString(str) } catch { return undefined }
}
function maybeAddress (str: string): Address | undefined {
  try { return Address.fromString(str) } catch { return undefined }
}
function getHeaderObject (header: BlockHeader) {
  return {
    height: header.height,
    timestamp: header.timestamp,
    lastBlockHash: header.lastBlockHash.toHexString(),
    transactionRoot: header.transactionRoot.toHexString(),
    lastBlockConsensusRoot: header.lastBlockConsensusRoot.toHexString(),
    nextValidatorSetRoot: header.nextValidatorSetRoot.toHexString(),
    appStateHash: header.appStateHash.toHexString()
  }
}
function getBodyObject (body: BlockBody, consensus: Consensus) {
  return {
    transactions: body.transactionList.transactions.map(t => serialize(t).toString('hex')),
    consensus: {
      height: consensus.vote.height,
      round: consensus.vote.round,
      blockHash: consensus.vote.blockHash.toHexString(),
      signatures: consensus.signatures.map(v => v.buffer.toString('hex'))
    }
  }
}

export class OuterApi extends Router {
  constructor (
    protected readonly state: State,
    protected readonly blockchain: Blockchain
  ) {
    super()
    this
      // async result
      .get('/awaiting/:id', async (ctx, _next) => {
        const hash = maybeHash(ctx.params.id)
        ctx.assert(hash, 400)
        const opt = await this.state.result.get(hash!)
        if (opt.isSome() && (await this.blockchain.height) >= opt.value.height + 1) {
          const res = opt.value.response
          ctx.response.status = res.status
          ctx.response.message = res.message
          for (const [key, value] of res.headers.list) {
            ctx.response.append(key, value)
          }
          ctx.response.body = res.body
        } else {
          ctx.status = 202
          ctx.body = {
            id: hash!.toHexString()
          }
        }
      })
      // accounts
      .get('/accounts/:address', async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const account = await this.state.getAccount(address!)
        ctx.body = {
          nonce: account.nonce,
          balance: account.balance
        }
      })
      .get('/accounts/:address/nonce', async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const account = await this.state.getAccount(address!)
        ctx.body = [ account.nonce ]
      })
      .get('/accounts/:address/balance', async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const account = await this.state.getAccount(address!)
        ctx.body = [ account.balance ]
      })
      .get('/height', async (ctx, _next) => {
        ctx.body = [ await this.blockchain.height ]
      })
      .get('/block/:height', async (ctx, _next) => {
        const height = await this.maybeValidHeight(ctx.params.height)
        ctx.assert(height, 400)
        const header = getHeaderObject(await this.blockchain.headerOf(height!))
        const body = getBodyObject(await this.blockchain.bodyOf(height!), await this.blockchain.consensusOf(height!))
        const hash = (await this.blockchain.hashOf(height!)).toHexString()
        ctx.body = {
          header: header,
          body: body,
          hash: hash
        }
      })
      .get('/block/:height/header', async (ctx, _next) => {
        const height = await this.maybeValidHeight(ctx.params.height)
        ctx.assert(height, 400)
        ctx.body = getHeaderObject(await this.blockchain.headerOf(height!))
      })
      .get('/block/:height/body', async (ctx, _next) => {
        const height = await this.maybeValidHeight(ctx.params.height)
        ctx.assert(height, 400)
        ctx.body = getBodyObject(await this.blockchain.bodyOf(height!), await this.blockchain.consensusOf(height!))
      })
      .get('/block/:height/hash', async (ctx, _next) => {
        const height = await this.maybeValidHeight(ctx.params.height)
        ctx.assert(height, 400)
        ctx.body = [ (await this.blockchain.hashOf(height!)).toHexString() ]
      })
      .get('/transaction/:txHash', async (ctx, _next) => {
        const opt = await this.state.result.get(Hash.fromHexString(ctx.params.txHash))
        if (!opt.isSome()) {
          ctx.status = 400
          return
        }
        const { height } = opt.value
        const block = await this.blockchain.bodyOf(height)
        const tx = block.transactionList.transactions.find(t => t.hash.toHexString() === ctx.params.txHash)
        if (tx === undefined) {
          ctx.body = []
          return
        }
        ctx.body = [ serialize(tx).toString('hex') ]
      })
      .get('/transaction/proof/:txHash', async (ctx, _next) => {
        const opt = await this.state.result.get(Hash.fromHexString(ctx.params.txHash))
        if (!opt.isSome()) {
          ctx.status = 400
          return
        }
        const { height } = opt.value
        ctx.assert(height, 400)
        const proof = await this.state.getMerkleProof(height, Hash.fromHexString(ctx.params.txHash))
        ctx.body = proof.map(h => h.toHexString())
      })
    this.use()
  }

  private async maybeValidHeight (str: string): Promise<number | undefined> {
    // number or 'latest'
    if (isNaN(Number(str)) && str !== 'latest') { return undefined }
    const height = str === 'latest' ? await this.blockchain.height : Number(str)
    if (height > await this.blockchain.height) { return undefined }
    return height
  }
}

export class InnerApi extends OuterApi {
  private readonly mutex = new Mutex()
  constructor (
    state: State,
    blockchain: Blockchain
  ) {
    super(state, blockchain)
    this
      .put('/accounts/:address/balance', BodyParser(), async (ctx, _next) => {
        const address = maybeAddress(ctx.params.address)
        ctx.assert(address, 400)
        const [balance] = ctx.request.body as [number]
        ctx.assert(balance && typeof (balance as any) === 'number', 400)
        await this.mutex.use(async () => {
          const account = await this.state.getAccount(address!)
          await this.state.setAccount(address!, account.setBalance(balance))
        })
        ctx.body = [ balance ]
      })
      .post('/accounts/:address/transfer', BodyParser(), async (ctx, _next) => {
        const { to, value } = ctx.request.body as { to: string, value: number }
        const fromAddr = maybeAddress(ctx.params.address)
        const toAddr = maybeAddress(to)
        ctx.assert(fromAddr, 400)
        ctx.assert(toAddr, 400)
        ctx.assert(value && typeof (value as any) === 'number', 400)

        if (fromAddr! !== toAddr!) {
          await this.mutex.use(async () => {
            const fromAccount = await this.state.getAccount(fromAddr!)
            const toAccount = await this.state.getAccount(toAddr!)
            await this.state.setAccount(fromAddr!, fromAccount.decreaseBalance(value))
            await this.state.setAccount(toAddr!, toAccount.increaseBalance(value))
          })
        }
        ctx.status = 200
      })
    this.use()
  }
}
