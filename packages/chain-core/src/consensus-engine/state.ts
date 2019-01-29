/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Block, Vote, ConsensusMessage, ValidatorSet } from '@uniqys/blockchain'
import { Address, Hash, Signature } from '@uniqys/signature'
import { Optional } from '@uniqys/types'
import { ReadWriteLock } from '@uniqys/lock'

export enum Step {
  NewRound, // wait until need to make a new block
  Propose, // propose step
  Prevote, // prevote step
  PrevoteWait, // wait more prevote until timeout after receive +2/3 prevote
  Precommit, // precommit step
  PrecommitWait, // wait more precommit until timeout after receive +2/3 precommit
  Committed // wait chain and execute committed block
}

export class VoteSet<T extends ConsensusMessage.VoteMessage> {
  private power = 0
  private readonly powerOfBlock = new Map<string, number>() // vote power for the block
  private readonly messageOfValidator = new Map<string, T>() // vote message from validator
  private _twoThirdsMajority = Optional.none<Vote>()
  public get twoThirdsMajority () { return this._twoThirdsMajority }
  private _twoThirdsAny = false
  public get twoThirdsAny () { return this._twoThirdsAny }
  private _oneThirdAny = false
  public get oneThirdAny () { return this._oneThirdAny }
  constructor (
    private readonly validatorSet: ValidatorSet
  ) { }

  public add (address: Address, message: T) {
    const validator = address.toString()
    if (this.messageOfValidator.has(validator)) throw new Error('duplicated vote message')
    this.messageOfValidator.set(validator, message)

    const votePower = this.validatorSet.powerOf(address)
    const block = message.vote.blockHash.toHexString()
    const blockPower = (this.powerOfBlock.get(block) || 0) + votePower
    this.powerOfBlock.set(block, blockPower)
    const totalPower = this.power + votePower
    this.power = totalPower

    if (this.twoThirdsMajority.isNone() && (blockPower * 3 > this.validatorSet.totalPower * 2)) {
      this._twoThirdsMajority = Optional.some(message.vote)
    }
    if (this.twoThirdsAny === false && (totalPower * 3 > this.validatorSet.totalPower * 2)) {
      this._twoThirdsAny = true
    }
    if (this.oneThirdAny === false && (totalPower * 3 > this.validatorSet.totalPower)) {
      this._oneThirdAny = true
    }
  }

  public has (address: Address) {
    const validator = address.toString()
    return this.messageOfValidator.has(validator)
  }

  public signatures (blockHash: Hash): Signature[] {
    return Array.from(this.messageOfValidator.values())
      .filter(msg => msg.vote.blockHash.equals(blockHash))
      .map(msg => msg.sign)
  }

  public messages () {
    return this.messageOfValidator.values()
  }
}

export class RoundState {
  public proposal?: ConsensusMessage.ProposalMessage
  public readonly prevote: VoteSet<ConsensusMessage.PrevoteMessage>
  public readonly precommit: VoteSet<ConsensusMessage.PrecommitMessage>
  constructor (
    validatorSet: ValidatorSet
  ) {
    this.prevote = new VoteSet(validatorSet)
    this.precommit = new VoteSet(validatorSet)
  }
}

export class State {
  public readonly lock = new ReadWriteLock()
  private _height = 0
  public get height () { return this._height }
  private _appStateHash = Hash.zero
  public get appStateHash () { return this._appStateHash }
  private _validatorSet = new ValidatorSet([])
  public get validatorSet () { return this._validatorSet }
  public lockedRound = 0
  public lockedBlock?: Block
  public validRound = 0
  public validBlock?: Block
  public round = 1
  public step = Step.NewRound
  private roundState = new Map<number, RoundState>()
  public newHeight (height: number, appStateHash: Hash, validatorSet: ValidatorSet) {
    this._height = height
    this._appStateHash = appStateHash
    this._validatorSet = validatorSet
    this.lockedRound = 0
    this.lockedBlock = undefined
    this.validRound = 0
    this.validBlock = undefined
    this.roundState = new Map()
    this.newRound(1)
  }
  public newRound (round: number) {
    this.round = round
    this.step = Step.NewRound
  }
  public roundStateOf (round: number): RoundState {
    const roundState = this.roundState.get(round)
    if (roundState) {
      return roundState
    } else {
      const newRoundState = new RoundState(this.validatorSet)
      this.roundState.set(round, newRoundState)
      return newRoundState
    }
  }
  public get currentRoundState () {
    return this.roundStateOf(this.round)
  }
}
