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

import { Address } from './address'
import { KeyPair } from './cryptography'
import { serialize, deserialize } from '@uniqys/serialize'

describe('Address', () => {
  it('can be made from public key', () => {
    expect(() => { Address.fromPublicKey(new KeyPair().publicKey) }).not.toThrow()
  })
  it('can be made from key pair shorthand', () => {
    const keyPair = new KeyPair()
    expect(keyPair.address.toString()).toBe(Address.fromPublicKey(keyPair.publicKey).toString())
  })
  it('has string representation', () => {
    const address = new KeyPair().address
    const stringRepresentation = address.toString()
    expect(Address.fromString(stringRepresentation).equals(address)).toBeTruthy()
  })
  it('is serializable', () => {
    const address = Address.fromPublicKey(new KeyPair().publicKey)
    expect(deserialize(serialize(address), Address.deserialize).equals(address)).toBeTruthy()
  })
})
