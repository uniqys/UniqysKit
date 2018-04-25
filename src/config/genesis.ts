import { Config } from './loader'
import { Genesis } from './schema-generated/genesis'
import { MerkleTree } from '../structure/merkle-tree'
import { Hash } from '../structure/cryptography'
import { Address } from '../structure/address'
import { Block, BlockData, Consensus, ValidatorSet, Validator, BlockHeader } from '../structure/blockchain'

export class GenesisConfig extends Config<Genesis> {
  constructor () { super(require('./schema-generated/genesis.json')) }

  public async loadAsBlock (configFile: string): Promise<Block> {
    const config = await this.load(configFile)
    const data = new BlockData(
      new MerkleTree([]),
      new Consensus(0, new MerkleTree([])),
      new ValidatorSet(config.validatorSet.map(v => new Validator(Address.fromString(v.address), v.power)))
    )
    const header = new BlockHeader(
      1,
      config.timestamp,
      Hash.fromData(config.unique),
      data.transactions.root,
      data.lastBlockConsensus.hash,
      data.nextValidatorSet.root,
      new Hash(Buffer.alloc(32))
    )
    return new Block(data, header)
  }
}
