import { Address } from './address'
import { KeyPair } from './cryptography'

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
})
