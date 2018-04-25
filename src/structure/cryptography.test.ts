import { Hash, KeyPair } from './cryptography'
import { Bytes32 } from './bytes'

/* tslint:disable:no-unused-expression */
describe('Hash', () => {
  it('is keccak256', () => {
    expect(Hash.fromData('The quick brown fox jumps over the lazy dog').buffer.toString('hex'))
      .toBe('4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15')
  })
})

describe('KeyPair', () => {
  it('can be made by specific private key', () => {
    const privateKey = new Bytes32(Buffer.from('This is very awesome private key'))
    expect(() => { new KeyPair(privateKey) }).not.toThrow()
  })
  it('can be made by random generated key', () => {
    expect(() => { new KeyPair() }).not.toThrow()
  })
})

describe('Signature', () => {
  it('sign message and recover', () => {
    const message = Hash.fromData('The quick brown fox jumps over the lazy dog')
    const key = new KeyPair()
    expect(key.sign(message).recover(message).equals(key.publicKey)).toBeTruthy()
  })
  it('can not recover invalid signature', () => {
    const message = Hash.fromData('The quick brown fox jumps over the lazy dog')
    // random key can recover after modified rarely
    const key = new KeyPair(new Bytes32(Buffer.from('cbfde2698ab8d8d3f2ddfea748d972bcc9cd5b74f3152c13d51d9c576e0a15f5', 'hex')))
    const sign = key.sign(message)
    sign.signature.buffer.write('modify')
    expect(() => { sign.recover(message) }).toThrow('couldn\'t recover public key from signature')
  })
})
