import { Block, TransactionList, Consensus, ValidatorSet, Validator } from '@uniqys/blockchain'
import { Config } from '@uniqys/config-loader'
import { Address, Hash } from '@uniqys/signature'

import { Genesis } from './genesis'

export class GenesisConfig extends Config<Genesis> {
  constructor () { super(require('../../config-schema/genesis.json')) }

  public async loadAsBlock (configFile: string): Promise<Block> {
    const config = await this.load(configFile)
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
}
