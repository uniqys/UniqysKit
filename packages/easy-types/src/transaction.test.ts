/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Transaction, SignedTransaction } from './transaction'
import { HttpRequest } from './http-message'
import { KeyPair } from '@uniqys/signature'
import { serialize, deserialize } from '@uniqys/serialize'

/* tslint:disable:no-unused-expression */
describe('transaction', () => {
  let signer: KeyPair
  beforeAll(() => {
    signer = new KeyPair()
  })
  it('contains http request', () => {
    const request = new HttpRequest('POST', '/foo_action')
    const tx = new Transaction(1, request)
    expect(tx).toBeInstanceOf(Transaction)
    expect(tx.nonce).toBe(1)
    expect(tx.request).toEqual(request)
  })
  it('can be signed', () => {
    const tx = new Transaction(42, new HttpRequest('POST', '/bar_action'))
    const signed = SignedTransaction.sign(signer, tx)
    expect(signed).toBeInstanceOf(SignedTransaction)
    expect(signed.signer.equals(signer.address)).toBeTruthy()
  })
  it('is serializable', () => {
    const tx = new Transaction(100, new HttpRequest('POST', '/fizz_action'))
    const signed = SignedTransaction.sign(signer, tx)
    expect(deserialize(serialize(signed), SignedTransaction.deserialize)).toEqual(signed)
  })
  it('has alias', () => {
    const tx = new Transaction(42, new HttpRequest('POST', '/bar_action'))
    const signed = SignedTransaction.sign(signer, tx)
    expect(signed.nonce).toBe(tx.nonce)
    expect(signed.request).toBe(tx.request)
  })
})
