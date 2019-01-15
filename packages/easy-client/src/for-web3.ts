/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { EasyClient } from './client'
import { Signature } from '@uniqys/signature'
import { Transaction } from '@uniqys/easy-types'
import Web3 = require('web3')
import { Provider } from 'web3/providers';
import utils = require('ethereumjs-util')

/*
function checkLocalStorage () {
  try {
    localStorage.setItem('__localStorage_test__', '__test__')
    localStorage.removeItem('__localStorage_test__')
    return true
  } catch (e) {
    return false
  }
}
*/

export class EasyClientForWeb3 extends EasyClient {
  constructor (provider: Provider, base: string) {

    const web3 = new Web3(provider);

    const signer = {
      address: async () => {return utils.toBuffer(web3.eth.getAccounts()[0])},
      sign: async (tx: Transaction) => {
        const account = await web3.eth.getAccounts()[0];
        return new Promise<Signature>((resolve) => {
          resolve(web3.eth.sign(utils.bufferToHex(tx.hash.buffer), account))
        })
      }
    }

    super(signer, { baseURL: base })
  }
}
