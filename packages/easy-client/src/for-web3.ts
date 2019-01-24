/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { EasyClient } from './client'
import { Address, Signature } from '@uniqys/signature'
import { Transaction } from '@uniqys/easy-types'
import Web3 from 'web3'
import { Provider } from 'web3/providers'

export class EasyClientForWeb3 extends EasyClient {

  constructor (provider: Provider, base: string) {
   const web3 = new Web3(provider)
   const selectedAddress = async () => {
    const accounts = await web3.eth.getAccounts()
    return Address.fromString(accounts[0].substring(2))
   }

   const signer = {
    address: Address.zero,
    async sign (tx: Transaction) {
     this.address = await selectedAddress()
     const sig = await web3.eth.sign('0x' + Buffer.from(tx.hash.buffer).toString('hex'), this.address.toString())
     const buffer = Buffer.from(sig.substr(2), 'hex')
     buffer[64] = buffer[64] - 27
     return new Signature(buffer)
    }
   }
 ​
   setInterval(async function() {
    const address = await selectedAddress()
    if (!signer.address.equals(address)) {
     signer.address = address;
    }
   }, 100);
 ​
   selectedAddress().then(address => signer.address = address)
   super(signer, { baseURL: base })
  }

 }