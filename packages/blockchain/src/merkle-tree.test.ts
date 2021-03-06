/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { MerkleTree } from './merkle-tree'
import { Hash, Hashable } from '@uniqys/signature'

class MockHashable implements Hashable {
  public readonly hash: Hash
  constructor (
    public readonly label: string
  ) {
    this.hash = Hash.fromData(label)
  }
}

const concatHash = (a: Hash, b: Hash): Hash => Hash.fromData(Buffer.concat([a.buffer, b.buffer].sort(Buffer.compare)))

describe('MerkleTree', () => {
  it('root is H(a) if items are [a]', () => {
    const a = new MockHashable('The quick brown fox jumps over the lazy dog')
    const root = MerkleTree.root([a])
    expect(root.equals(a.hash)).toBeTruthy()
  })
  it('root is H(H(a);H(b)) if items are [a, b]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const root = MerkleTree.root([a, b])
    expect(root.equals(concatHash(a.hash, b.hash))).toBeTruthy()
  })
  /*
  expect:
     __|__
   _|_    |
  |   |   c
  a   b
  */
  it('root is H(H(H(a);H(b));H(c)) if items are [a, b, c]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const root = MerkleTree.root([a, b, c])
    expect(root.equals(concatHash(concatHash(a.hash, b.hash), c.hash))).toBeTruthy()
  })
  /*
  expect:
         ____|____
     ___|___      |
   _|_     _|_    e
  |   |   |   |
  a   b   c   d

  not:
        ___|____
     __|__     _|_
   _|_    |   |   |
  |   |   c   d   e
  a   b
  */
  it('root is H( H( H(H(a);H(b)) ; H(H(c);H(d)) ) ; H(e) ) if items are [a, b, c, d, e]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const d = new MockHashable('d')
    const e = new MockHashable('e')
    const root = MerkleTree.root([a, b, c, d, e])
    expect(root.equals(
      concatHash(
        concatHash(
          concatHash(a.hash, b.hash),
          concatHash(c.hash, d.hash)
        ),
        e.hash
      )
    )).toBeTruthy()
  })
  it('root is hash of 0 byte if items are empty', () => {
    expect(MerkleTree.root([]).equals(Hash.fromData(Buffer.alloc(0)))).toBeTruthy()
  })
  it('creates valid proof for c of [a, b, c, d, e]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const d = new MockHashable('d')
    const e = new MockHashable('e')
    const root = MerkleTree.root([a, b, c, d, e])
    const proof = MerkleTree.proof([a, b, c, d, e], c)
    expect(MerkleTree.verify(proof, root, c.hash)).toBeTruthy()
    expect(proof.length).toBe(3)
  })
  it('creates valid proof for e of [a, b, c, d, e]', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const d = new MockHashable('d')
    const e = new MockHashable('e')
    const root = MerkleTree.root([a, b, c, d, e])
    const proof = MerkleTree.proof([a, b, c, d, e], e)
    expect(MerkleTree.verify(proof, root, e.hash)).toBeTruthy()
    expect(proof.length).toBe(1)
  })
  it('rejects invalid proof', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const d = new MockHashable('d')
    const e = new MockHashable('e')
    const root = MerkleTree.root([a, b, c, d, e])
    expect(MerkleTree.verify(MerkleTree.proof([a, b, c, d, e], a), root, b.hash)).toBeFalsy()
  })
  it('throws if target does not exist', () => {
    const a = new MockHashable('a')
    const b = new MockHashable('b')
    const c = new MockHashable('c')
    const d = new MockHashable('d')
    const e = new MockHashable('e')
    expect(() => { MerkleTree.proof([a, b, c, d], e) }).toThrow()
  })
})
