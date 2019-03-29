/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

const Uniqys = artifacts.require('TestUniqys')
import { Signature, KeyPair, Hash } from '@uniqys/signature'
import { serialize } from '@uniqys/serialize'
import { SignedTransaction, Transaction, HttpRequest, HttpHeaders } from '@uniqys/easy-types'
import { Transaction as CoreTransaction, TransactionType } from '@uniqys/blockchain'
import { hexStr, toBuffer, toString } from './test-utils'

contract('Uniqys', function () {
  let uniqys: any
  let signer: KeyPair

  beforeEach(async () => {
    uniqys = await Uniqys.new()

    signer = new KeyPair()
  })

  it('parseSignature', async () => {
    const sign: Signature = signer.sign(Hash.fromData('foo'))
    const args = [
      hexStr(serialize(sign))
    ]
    const result = await uniqys.parseSignature(...args)

    assert.equal(hexStr(sign.buffer.slice(0, 32)), result.r)
    assert.equal(hexStr(sign.buffer.slice(32, 64)), result.s)
    assert.equal(sign.recovery.toString(), result.v.toString(10))

  })

  it('parseTransaction', async () => {
    const method = 'GET'
    const path = '/foo'
    const headers = new HttpHeaders([['Foo', 'Bar']])
    const body = Buffer.from('baz')

    const tx = new Transaction(42, new HttpRequest(method, path, headers, body))
    const signedTx = SignedTransaction.sign(signer, tx)

    const coreTx = new CoreTransaction(TransactionType.Normal, serialize(signedTx))

    const args = [
      hexStr(serialize(coreTx))
    ]

    const result = await uniqys.parseTransaction(...args)

    assert.strictEqual(signer.address.toString(), result.signer.slice(2).toLowerCase())
    assert.strictEqual(method, toString(result.method))
    assert.strictEqual(path, toString(result.path))

    headers.list.forEach((header, i) => {
      const [key, value] = header
      assert.strictEqual(key, toString(result.headerKeys[i]))
      assert.strictEqual(value, toString(result.headerValues[i]))
    })

    assert.deepEqual(body, toBuffer(result.body))
  })
})
