/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Account } from './account'
import { serialize, deserialize } from '@uniqys/serialize'

describe('account', () => {
  it('is serializable', () => {
    const account = new Account(42, 123)
    expect(deserialize(serialize(account), Account.deserialize)).toEqual(account)
  })
  it('default value', () => {
    const account = Account.default
    expect(account.nonce).toBe(0)
    expect(account.balance).toBe(0)
  })
  it('increment nonce', () => {
    const account = new Account(42, 123)
    const incremented = account.incrementNonce()
    expect(incremented.nonce).toBe(43)
    expect(incremented.balance).toBe(123)
  })
  it('increase balance', () => {
    const account = new Account(42, 123)
    const increased = account.increaseBalance(10)
    expect(increased.nonce).toBe(42)
    expect(increased.balance).toBe(133)
  })
  it('decrease balance', () => {
    const account = new Account(42, 123)
    const decreased = account.decreaseBalance(10)
    expect(decreased.nonce).toBe(42)
    expect(decreased.balance).toBe(113)
  })
  it('throw error if decrease too many balance', () => {
    const account = new Account(42, 123)
    expect(() => { account.decreaseBalance(123) }).not.toThrow()
    expect(() => { account.decreaseBalance(124) }).toThrow()
  })
  it('set balance', () => {
    const account = new Account(42, 123)
    const set = account.setBalance(100)
    expect(set.nonce).toBe(42)
    expect(set.balance).toBe(100)
  })
})
