/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { EasyClient } from './client'
import { KeyPair, Address, Signature } from '@uniqys/signature'
import { Transaction } from '@uniqys/easy-types'
import { Bytes32 } from '@uniqys/types'

function checkLocalStorage () {
  try {
    localStorage.setItem('__localStorage_test__', '__test__')
    localStorage.removeItem('__localStorage_test__')
    return true
  } catch (e) {
    return false
  }
}

// This implementation is only for development use.
// It is NOT secure, because it save private key in localStorage.
const key = 'easy_private_key'
export class EasyClientForBrowser extends EasyClient {
  constructor (base: string) {
    if (!checkLocalStorage()) { throw new Error('available localStorage required') }

    const getKeyPair = () => {
      const privateKeyString = localStorage.getItem(key)
      const privateKey = privateKeyString
        ? new Bytes32(Buffer.from(privateKeyString, 'hex'))
        : (() => {
          const privateKey = KeyPair.generatePrivateKey()
          localStorage.setItem(key, privateKey.buffer.toString('hex'))
          return privateKey
        })()
      return new KeyPair(privateKey)
    }

    const signer = {
      address: new Promise<Address>((resolve) => {
        resolve(getKeyPair().address)
      }),
      sign: async (tx: Transaction) => {
        const msg = `
Accept to sign this post?
nonce: ${tx.nonce}
method: ${tx.request.method}
path: ${tx.request.path}
headers:
${tx.request.headers.list.map(kv => `  ${kv['0']}: ${kv['1']}`).join('\n')}
body:
${tx.request.body.toString()}
`
        return new Promise<Signature>((resolve, reject) => {
          if (confirm(msg)) {
            resolve(getKeyPair().sign(tx.hash))
          } else {
            reject(new Error('sign rejected'))
          }
        })
      }
    }

    super(signer, { baseURL: base })
  }
}
