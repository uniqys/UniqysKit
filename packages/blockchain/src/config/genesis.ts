import { Config } from '@uniqys/config-validator'
import { Address, Hash } from '@uniqys/signature'
import { Block } from '../block'
import { TransactionList } from '../transaction'
import { Consensus, ValidatorSet, Validator, Vote } from '../consensus'

import { GenesisSchema } from './genesis-schema'

export class GenesisConfig extends Config<GenesisSchema> {
  constructor () { super(require('./genesis-schema.json')) }

  private asBlockAndValidatorSet (config: GenesisSchema): [Block, ValidatorSet] {
    const zeroHash = Hash.fromData(config.unique)
    const validatorSet = new ValidatorSet(config.validatorSet.map(v => new Validator(Address.fromString(v.address), v.power)))
    return [
      Block.construct(
        1,
        config.timestamp,
        zeroHash,
        validatorSet.hash,
        new Hash(Buffer.alloc(32)),
        new TransactionList([]),
        new Consensus(new Vote(0, 1, zeroHash), []) // TODO: round = 1, OK?
      ),
      validatorSet
    ]
  }

  public validateAsBlockAndValidatorSet (config: {}): [Block, ValidatorSet] {
    return this.asBlockAndValidatorSet(this.validate(config))
  }
}
