import { Transaction } from 'chain-core/blockchain'
import { Signature } from 'cryptography'
import { Bytes32 } from 'bytes'

describe('transaction', () => {
  it('create', () => {
    let sign = new Signature(new Bytes32(new Buffer(32)), new Bytes32(new Buffer(32)))
    expect(new Transaction(sign, 1234, new Buffer(32))).toBeDefined()
  })
})
