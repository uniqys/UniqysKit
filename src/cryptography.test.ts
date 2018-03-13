import { Hash, KeyPair } from 'cryptography'
import { Bytes32 } from 'bytes'

/* tslint:disable:no-unused-expression */
describe('Hash', () => {
  it('is keccak256', () => {
    expect(Hash.fromData('The quick brown fox jumps over the lazy dog').buffer.toString('hex'))
      .toBe('4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15')
  })
})

describe('KeyPair', () => {
  it('can be made by specific private key', () => {
    const privateKey = new Bytes32(new Buffer('This is very awesome private key'))
    expect(() => { new KeyPair(privateKey) }).not.toThrow()
  })
  it('can be made by random generated key', () => {
    expect(() => { new KeyPair() }).not.toThrow()
  })
})

describe('Signature', () => {
  it('sign message and recovery', () => {
    const message = Hash.fromData('The quick brown fox jumps over the lazy dog')
    const key = new KeyPair()
    expect(key.sign(message).recover(message).equals(key.publicKey)).toBeTruthy()
  })
})
