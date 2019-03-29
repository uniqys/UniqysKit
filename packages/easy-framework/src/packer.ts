/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { HttpHeaders, HttpRequest, HttpResponse, Transaction, EventTransaction, SignedTransaction } from '@uniqys/easy-types'
import { BlockHeader } from '@uniqys/blockchain'
import { Signature, Hash } from '@uniqys/signature'
import http from 'http'
import { URL } from 'url'
import urljoin from 'url-join'

export namespace Headers {
  export function pack (headers: http.IncomingHttpHeaders): HttpHeaders {
    // case insensitive
    for (const key of ['Content-Type', 'content-type']) {
      if (headers[key]) headers[key] = (headers[key] as string).toLowerCase()
    }
    // select headers
    const value = headers['uniqys-include-headers']
    const includes = (value && typeof value === 'string') ? value.split(/\s*,\s*/).map(s => s.toLowerCase()) : []
    return HttpHeaders.fromObject(headers, key => !(/^uniqys-.+/.test(key) || !includes.includes(key)))
  }
  export function unpack (headers: HttpHeaders): http.IncomingHttpHeaders {
    return headers.toObject()
  }
}
export namespace Request {
  export async function pack (message: http.IncomingMessage, to: URL): Promise<HttpRequest> {
    if (!message.method) throw new Error('missing method')
    const url = message.url && new URL(message.url, to)
    const path = url && (url.pathname + url.search)
    if (!path) throw new Error('missing path')
    const headers = Headers.pack(message.headers)
    const body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      message.on('data', chunk => { chunks.push(chunk as Buffer) })
      message.on('end', () => { resolve(Buffer.concat(chunks)) })
      message.on('error', err => reject(err))
    })
    return new HttpRequest(message.method, path, headers, body)
  }
}
export namespace Response {
  export async function pack (message: http.IncomingMessage): Promise<HttpResponse> {
    if (!message.statusCode) throw new Error('missing status code')
    if (!message.statusMessage) throw new Error('missing status message')
    const headers = Headers.pack(message.headers)
    const body = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      message.on('data', chunk => { chunks.push(chunk as Buffer) })
      message.on('end', () => { resolve(Buffer.concat(chunks)) })
      message.on('error', err => reject(err))
    })
    return new HttpResponse(message.statusCode, message.statusMessage, headers, body)
  }
}
export namespace SignedRequest {
  export async function pack (request: http.IncomingMessage, to: URL): Promise<SignedTransaction> {
    const signString = request.headers['uniqys-sign']
    if (!(signString && typeof signString === 'string')) throw new Error('missing sign header')
    const sign = new Signature(Buffer.from(signString, 'base64'))

    const nonceString = request.headers['uniqys-nonce']
    if (!(nonceString && typeof nonceString === 'string')) throw new Error('missing nonce header')
    const nonce = Number.parseInt(nonceString, 10)

    const req = await Request.pack(request, to)
    const tx = new Transaction(nonce, req)

    sign.recover(tx.hash) // check signature
    return new SignedTransaction(sign, tx)
  }
  export async function unpack (signedTx: SignedTransaction, blockHeader: BlockHeader, coreTxHash: Hash, to: URL): Promise<http.IncomingMessage> {
    return new Promise<http.IncomingMessage>((resolve, reject) => {
      const headers = Headers.unpack(signedTx.transaction.request.headers)
      headers['uniqys-sender'] = signedTx.signer.toString()
      headers['uniqys-nonce'] = signedTx.nonce.toString(10)
      headers['uniqys-blockheight'] = blockHeader.height.toString(10)
      headers['uniqys-timestamp'] = blockHeader.timestamp.toString(10)
      headers['uniqys-blockhash'] = blockHeader.hash.toHexString()
      headers['uniqys-txhash'] = coreTxHash.toHexString()
      const req = http.request({
        protocol: to.protocol,
        host: to.hostname,
        port: to.port,
        method: signedTx.transaction.request.method,
        path: signedTx.transaction.request.path,
        headers: headers
      }, res => resolve(res))
      req.on('error', reject)
      req.write(signedTx.transaction.request.body)
      req.end()
    })
  }
}

export namespace EventRequest {
  export async function unpack (eventTx: EventTransaction, blockHeader: BlockHeader, coreTxHash: Hash, to: URL): Promise<http.IncomingMessage> {
    return new Promise<http.IncomingMessage>((resolve, reject) => {
      const headers = Headers.unpack(eventTx.transaction.request.headers)
      headers['uniqys-nonce'] = eventTx.nonce.toString(10)
      headers['uniqys-blockheight'] = blockHeader.height.toString(10)
      headers['uniqys-timestamp'] = blockHeader.timestamp.toString(10)
      headers['uniqys-blockhash'] = blockHeader.hash.toHexString()
      headers['uniqys-txhash'] = coreTxHash.toHexString()
      const req = http.request({
        protocol: to.protocol,
        host: to.hostname,
        port: to.port,
        method: eventTx.transaction.request.method,
        path: urljoin('/uniqys', eventTx.transaction.request.path),
        headers: headers
      }, res => resolve(res))
      req.on('error', reject)
      req.write(eventTx.transaction.request.body)
      req.end()
    })
  }
}
