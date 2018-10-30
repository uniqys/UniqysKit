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

import repl from 'repl'
import { inspect } from 'util'

import { KeyPair, Signature } from '@uniqys/signature'
import { EasyClient } from '@uniqys/easy-client'
import { Transaction } from '@uniqys/easy-types'

async function start (url: string) {
  const keyPair = new KeyPair()
  const replServer = repl.start()
  const signer = {
    address: keyPair.address,
    sign: async (tx: Transaction) => {
      console.log(`nonce: ${tx.nonce}`)
      console.log(`method: ${tx.request.method}`)
      console.log(`path: ${tx.request.path}`)
      console.log('headers:')
      tx.request.headers.list.forEach(kv => console.log(`  ${kv['0']}: ${kv['1']}`))
      console.log('body:')
      console.log(tx.request.body.toString())
      return new Promise<Signature>((resolve, reject) => replServer.question('accept? (yes/no)>', (answer) => {
        if (answer === 'yes') {
          resolve(keyPair.sign(tx.hash))
        } else {
          reject(new Error('sign rejected'))
        }
      }))
    }
  }
  console.log(`address: ${keyPair.address.toString()}`)
  const easy = new EasyClient(signer, { baseURL: url })

  replServer.defineCommand('hello', {
    help: 'GET /hello',
    action (this: repl.REPLServer) {
      easy.get('/hello')
        .then(response => {
          console.log(`hello: ${inspect(response.data)}`)
          this.displayPrompt()
        })
        .catch(err => console.log(`error: ${err.message}`))
    }
  })
  replServer.defineCommand('account', {
    help: 'GET /uniqys/accounts/:me',
    action (this: repl.REPLServer) {
      easy.api.account(signer.address.toString())
        .then(account => {
          console.log(`account: balance ${account.balance}, nonce ${account.nonce}`)
          this.displayPrompt()
        })
        .catch(err => console.log(`error: ${err.message}`))
    }
  })
  replServer.defineCommand('read', {
    help: 'GET /messages/:id',
    action (this: repl.REPLServer, id: string) {
      easy.get(`/messages/${id}`)
        .then(response => {
          console.log(`messages: ${inspect(response.data)}`)
          this.displayPrompt()
        })
        .catch(err => console.log(`error: ${err.message}`))
    }
  })
  replServer.defineCommand('post', {
    help: 'POST /messages',
    action (this: repl.REPLServer, contents: string) {
      easy.post(`/messages`, { contents }, { sign: true })
        .then(response => {
          console.log(`post: ${inspect(response.data)}`)
          this.displayPrompt()
        })
        .catch(err => console.log(`error: ${err.message}`))
    }
  })
  replServer.defineCommand('send', {
    help: 'POST /send',
    action (this: repl.REPLServer, input: string) {
      const [value, to] = input.split(/\s+/)
      easy.post(`/send`, { to, value: parseInt(value, 10) }, { sign: true })
        .then(response => {
          console.log(`send: ${inspect(response.data)}`)
          this.displayPrompt()
        })
        .catch(err => console.log(`error: ${err.message}`))
    }
  })
}

start('http://localhost:8080').catch(err => console.log(`error: ${err}`))
