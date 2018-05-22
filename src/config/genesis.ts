import { Config } from './loader'
import { Genesis } from './schema-generated/genesis'
import { Hash } from '../structure/cryptography'
import { Address } from '../structure/address'
import { Block } from '../structure/blockchain/block'
import { TransactionList } from '../structure/blockchain/transaction'
import { Consensus, ValidatorSet, Validator } from '../structure/blockchain/consensus'

export class GenesisConfig extends Config<Genesis> {
  constructor () { super(require('./schema-generated/genesis.json')) }

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
