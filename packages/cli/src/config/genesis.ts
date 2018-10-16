import { Config } from '@uniqys/config-validator'
import { Address, Hash } from '@uniqys/signature'
import { Block, TransactionList, Consensus, ValidatorSet, Validator } from '@uniqys/blockchain'

import { GenesisSchema } from './genesis-schema'

export class GenesisConfig extends Config<GenesisSchema> {
  constructor () { super(require('./schema/genesis-schema.json')) }

  private asBlock (config: GenesisSchema): Block {
    return Block.construct(
      1,
      config.timestamp,
      Hash.fromData(config.unique),
      new Hash(Buffer.alloc(32)),
      new TransactionList([]),
      new Consensus([]),
      new ValidatorSet(config.validatorSet.map(v => new Validator(Address.fromString(v.address), v.power)))
    )
  }

  public validateAsBlock (config: {}): Block {
    return this.asBlock(this.validate(config))
  }
}
