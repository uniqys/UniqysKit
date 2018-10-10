import { Config } from '@uniqys/config-validator'
import { Address, Hash } from '@uniqys/signature'
import { Block } from '../block'
import { TransactionList } from '../transaction'
import { Consensus, ValidatorSet, Validator, Vote } from '../consensus'

import { GenesisSchema } from './genesis-schema'

export class GenesisConfig extends Config<GenesisSchema> {
  constructor () { super(require('./genesis-schema.json')) }

  private asBlock (config: GenesisSchema): Block {
    const zeroHash = Hash.fromData(config.unique)
    return Block.construct(
      1,
      config.timestamp,
      zeroHash,
      new Hash(Buffer.alloc(32)),
      new TransactionList([]),
      new Consensus(new Vote(0, 1, zeroHash), []), // TODO: round = 1, OK?
      new ValidatorSet(config.validatorSet.map(v => new Validator(Address.fromString(v.address), v.power)))
    )
  }

  public validateAsBlock (config: {}): Block {
    return this.asBlock(this.validate(config))
  }
}
