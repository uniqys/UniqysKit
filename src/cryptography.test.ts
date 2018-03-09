import { Hash, KeyPair } from 'cryptography'

describe('Hash', () => {
  it('is keccak256', () => {
    expect(Hash.fromData('The quick brown fox jumps over the lazy dog').buffer.toString('hex'))
      .toBe('4d741b6f1eb29cb2a9b9911c82f56fa8d73b04959d3d9d222895df6c0b28aa15')
  })
})

describe('Signature', () => {
  it('sign message and recovery', () => {
    const message = Hash.fromData('The quick brown fox jumps over the lazy dog')
    const key = new KeyPair()
    expect(key.sign(message).recover(message).equals(key.publicKey)).toBeTruthy()
  })
})
