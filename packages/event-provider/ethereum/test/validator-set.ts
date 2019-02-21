/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

const ValidatorSet = artifacts.require('TestValidatorSet')

/* tslint:disable */
import { Vote, BlockHeader, ConsensusMessage, MerkleTree } from "@uniqys/blockchain"
import { KeyPair, Hash } from '@uniqys/signature'
import { serialize, UInt64, UInt32 } from '@uniqys/serialize'
import { Bytes32 } from '@uniqys/types'
import { hexStr, assertAsyncThrows, initSigner } from './test-utils'


contract('ValidatorSet', function (accounts) {
  let validatorSet: any
  let privateKeys: Bytes32[] = []
  let signers: KeyPair[] = []
  let addresses: string[] = []


  before(async () => {
    validatorSet = await ValidatorSet.new()
    for (let i = 0; i < 4; i++) {
      const { signer, privateKey } = await initSigner(accounts[i])
      signers.push(signer)
      privateKeys.push(privateKey)
      addresses.push(hexStr(signer.address.buffer))
    }

    await validatorSet.updatePower(addresses[0], 9, { from: addresses[0] })
    await validatorSet.updatePower(addresses[1], 20, { from: addresses[1] })
    await validatorSet.updatePower(addresses[2], 1, { from: addresses[2] })
  })

  it('properly initializes power', async () => {
    const power1 = await validatorSet.powerOf(addresses[0])
    assert.equal(9, power1.toString(10))

    const power2 = await validatorSet.powerOf(addresses[1])
    assert.equal(20, power2.toString(10))

    const power3 = await validatorSet.powerOf(addresses[2])
    assert.equal(1, power3.toString(10))
  })

  it('properly removes validator from list', async () => {
    const validatorSet = await ValidatorSet.new()
    const { signer } = await initSigner(accounts[3])
    const address = hexStr(signer.address.buffer)

    await validatorSet.updatePower(address, 100, { from: address })
    assert.equal('1', (await validatorSet.getValidatorsCount()).toString(10))
    assert.equal(address, (await validatorSet.validators(0)).toLowerCase())

    await validatorSet.updatePower(address, 0, { from: address })
    assert.equal('0', (await validatorSet.getValidatorsCount()).toString(10))
  })

  it('validates if it has greater than 2/3 power signature', async () => {
    const target = Hash.fromData("foo")
    const signatures = signers.map(signer => signer.sign(target))

    const args = [
      `0x${target.toHexString()}`,
      signatures.map(signature => hexStr(serialize(signature)))
    ]
    const result = await validatorSet.isConsented(...args)

    assert.isTrue(result)
  })

  it('can not validate if it has not greater than 2/3 power signature', async() => {
    const target = Hash.fromData("foo")
    const signatures = [signers[1]].map(signer => signer.sign(target))

    const args = [
      `0x${target.toHexString()}`,
      signatures.map(signature => hexStr(serialize(signature)))
    ]
    const result = await validatorSet.isConsented(...args)

    assert.isFalse(result)
  })

  it('properly verifies block header', async () => {
    const height = 42
    const lastBlockHash = Hash.fromData('foo')
    const transactionsHash = Hash.fromData('transactions')
    const lastBlockConsensusHash = Hash.fromData('consensus')
    const nextValidatorSetHash = Hash.fromData('validator set')
    const state = Hash.fromData('bar')
    const epoch = 1520825696
    const header = new BlockHeader(height, epoch, lastBlockHash, transactionsHash, lastBlockConsensusHash, nextValidatorSetHash, state)
    const round = 1
    const vote = new Vote(header.height, round, header.hash)
    const genesisHash = Hash.fromData('genesis block')
    const digest = ConsensusMessage.PrecommitMessage.digest(vote, genesisHash)

    const signatures = signers.map(signer => signer.sign(digest))

    const args = [
      [
        hexStr(serialize(header.height, UInt64.serialize)),
        hexStr(serialize(header.timestamp, UInt64.serialize)),
        hexStr(serialize(header.lastBlockHash)),
        hexStr(serialize(header.transactionRoot)),
        hexStr(serialize(header.lastBlockConsensusRoot)),
        hexStr(serialize(header.nextValidatorSetRoot)),
        hexStr(serialize(header.appStateHash))
      ],
      hexStr(serialize(round, UInt32.serialize)),
      hexStr(serialize(genesisHash)),
      signatures.map(signature => hexStr(serialize(signature)))
    ]

    // no throw
    await validatorSet.verifyBlockHeader(...args)
  })

  it('properly verifies transaction', async () => {
    const a = Hash.fromData('a')
    const b = Hash.fromData('b')
    const c = Hash.fromData('c')
    const d = Hash.fromData('d')
    const e = Hash.fromData('e')
    const z = Hash.fromData('z')
    const root = MerkleTree.root([a, b, c, d, e])
    const proof = MerkleTree.proof([a, b, c, d, e], c)

    const getArgs = (hash: Hash) => {
      return [
        proof.map(hash => hexStr(serialize(hash))),
        hexStr(serialize(root)),
        hexStr(serialize(hash))
      ]
    }

    await validatorSet.verifyTransaction(...getArgs(c))

    await assertAsyncThrows(
      assert,
      async () => {
        await validatorSet.verifyTransaction(...getArgs(e))
      },
      /Could not prove transaction existence from proof/
    )

    await assertAsyncThrows(
      assert,
      async () => {
        await validatorSet.verifyTransaction(...getArgs(z))
      },
      /Could not prove transaction existence from proof/
    )

  })
})
