/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Hash, Hashable } from '@uniqys/signature'

// Basic Merkle Tree
// But, doesn't copy leaf for fix CVE-2012-2459
export namespace MerkleTree {
  export function root (items: Hash[]): Hash
  export function root<T extends Hashable> (items: T[]): Hash
  export function root (items: any) {
    return _root(items, 0, [])
  }

  export function proof (items: Hash[], target: Hash): Hash[]
  export function proof<T extends Hashable> (items: T[], target: T): Hash[]
  export function proof (items: any[], target: any): Hash[] {
    const targetHash = target instanceof Hash ? target : target.hash
    let index = -1
    for (let i = 0; i < items.length; i++) {
      const hash = items[i] instanceof Hash ? items[i] : items[i].hash
      if (hash.equals(targetHash)) {
        index = i
        break
      }
    }
    if (index === -1) { throw Error('target does not exist') }

    const tr = tree(items)
    const proof: Hash[] = []
    for (let d = tr.length - 1; d >= 1; d--) {
      if (index >= tr[d].length) {
        // skip depth
        index = Math.floor(index / 2)
        continue
      }
      if (index % 2 === 0) {
        proof.push(tr[d][index + 1])
      } else {
        proof.push(tr[d][index - 1])
      }
      index = Math.floor(index / 2)
    }
    return proof
  }

  export function verify (proof: Hash[], root: Hash, target: Hash): boolean {
    let hash = target
    proof.forEach(p => hash = Hash.fromData(Buffer.concat([hash.buffer, p.buffer].sort(Buffer.compare))))
    return hash.equals(root)
  }

  function tree (items: Hash[]): Hash[][]
  function tree<T extends Hashable> (items: T[], target: T): Hash[][]
  function tree (items: any[]): Hash[][] {
    const tr: Hash[][] = []
    _root(items, 0, tr)
    return tr
  }

  /* istanbul ignore next */
  function _root (items: Hash[], depth: number, tree: Hash[][]): Hash
  function _root<T extends Hashable> (items: T[], depth: number, tree: Hash[][]): Hash
  function _root (items: any[], depth: number, tree: Hash[][]): Hash {
    if (tree.length === depth) { tree.push([]) } // add depth
    if (items.length === 0) {
      const hash = Hash.fromData(Buffer.alloc(0))
      tree[depth].push(hash)
      return hash
    }
    if (items.length === 1) {
      const hash = items[0] instanceof Hash ? items[0] : items[0].hash
      tree[depth].push(hash)
      return hash
    }

    const split = splitPoint(items.length)
    const hash = Hash.fromData(Buffer.concat([
      _root(items.slice(0, split), depth + 1, tree).buffer,
      _root(items.slice(split), depth + 1, tree).buffer
    ].sort(Buffer.compare)))
    tree[depth].push(hash)
    return hash
  }

  function splitPoint (x: number): number {
    // this uses: i = 2^n, i < x <= 2i
    // also an option: i = n, x/2 <= i < x/2 + 1
    let i = 1
    while (i < x) { i <<= 1 }
    return i >> 1
  }
}
