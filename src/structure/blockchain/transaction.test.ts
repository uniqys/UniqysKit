import { Transaction, TransactionData, TransactionList } from './transaction'
import { Signature, KeyPair } from '../cryptography'
import { serialize, deserialize } from '../serializable'
import { MerkleTree } from '../merkle-tree'

/* tslint:disable:no-unused-expression */
describe('transaction', () => {
  let signer: KeyPair
  beforeAll(() => {
    signer = new KeyPair()
  })
  it('can create', () => {
    const sign = new Signature(Buffer.alloc(33))
    expect(new Transaction(sign, new TransactionData(1234, Buffer.alloc(32)))).toBeInstanceOf(Transaction)
  })
  it('can create by sign', () => {
    const data = new TransactionData(1234, Buffer.alloc(32))
    expect(Transaction.sign(signer, data)).toBeInstanceOf(Transaction)
  })
  it('can get signer', () => {
    const data = new TransactionData(1234, Buffer.alloc(32))
    expect(Transaction.sign(signer, data).signer.equals(signer.address)).toBeTruthy()
  })
  it('can set to map', () => {
    const transaction = Transaction.sign(signer, new TransactionData(1234, Buffer.from('The quick brown fox jumps over the lazy dog')))
    const map = new Map<string, Transaction>()
    map.set(transaction.hash.buffer.toString('hex'), transaction)
    const sameTransaction = Transaction.sign(signer, new TransactionData(1234, Buffer.from('The quick brown fox jumps over the lazy dog')))
    expect(map.get(sameTransaction.hash.buffer.toString('hex'))!.equals(sameTransaction)).toBeTruthy()
  })
  it('is serializable', () => {
    const transaction = Transaction.sign(signer, new TransactionData(1234, Buffer.from('The quick brown fox jumps over the lazy dog')))
    expect(deserialize(serialize(transaction), Transaction.deserialize).equals(transaction)).toBeTruthy()
  })
})

describe('transaction list', () => {
  let signer: KeyPair
  let transaction1: Transaction
  let transaction2: Transaction
  beforeAll(() => {
    signer = new KeyPair()
    transaction1 = Transaction.sign(signer, new TransactionData(1234, Buffer.from('The quick brown fox jumps over the lazy dog')))
    transaction2 = Transaction.sign(signer, new TransactionData(1235, Buffer.from('The quick brown fox jumps over the lazy dog')))
  })
  it('has merkle root', () => {
    const list = new TransactionList([transaction1, transaction2])
    expect(list.hash.equals(MerkleTree.root([transaction1, transaction2]))).toBeTruthy()
    expect(deserialize(serialize(list), TransactionList.deserialize).hash.equals(list.hash)).toBeTruthy()
  })
  it('is serializable', () => {
    const list = new TransactionList([transaction1, transaction2])
    expect(deserialize(serialize(list), TransactionList.deserialize).hash.equals(list.hash)).toBeTruthy()
  })
})
