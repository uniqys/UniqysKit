/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

export interface TimeoutOptions {
  proposeTimeout: number,
  proposeTimeoutIncreaseRate: number,
  prevoteTimeout: number,
  prevoteTimeoutIncreaseRate: number,
  precommitTimeout: number,
  precommitTimeoutIncreaseRate: number
}
export namespace TimeoutOptions {
  export const defaults: TimeoutOptions = {
    proposeTimeout: 3000,
    proposeTimeoutIncreaseRate: 1.2,
    prevoteTimeout: 1000,
    prevoteTimeoutIncreaseRate: 1.2,
    precommitTimeout: 1000,
    precommitTimeoutIncreaseRate: 1.2
  }
}

export class ConsensusTimeout {
  private readonly options: TimeoutOptions
  constructor (
    options: Partial<TimeoutOptions>
  ) {
    this.options = Object.assign({}, TimeoutOptions.defaults, options)
  }

  public propose (round: number) {
    return this.options.proposeTimeout * Math.pow(this.options.proposeTimeoutIncreaseRate, round)
  }

  public prevote (round: number) {
    return this.options.prevoteTimeout * Math.pow(this.options.prevoteTimeoutIncreaseRate, round)
  }

  public precommit (round: number) {
    return this.options.precommitTimeout * Math.pow(this.options.precommitTimeoutIncreaseRate, round)
  }
}
