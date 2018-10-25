import { Block, TransactionList, ValidatorSet, Validator, Consensus, Vote } from '@uniqys/blockchain'
import { Hash, Address } from '@uniqys/signature'
import { Config } from '@uniqys/config-validator'

export interface ValidatorSchema {
  /**
   * Address of validator.
   *
   * @length 40
   */
  address: string
  /**
   * Vote power of validator.
   *
   * @minimum 0
   * @TJS-type integer
   */
  power: number
}

export interface DappConfigSchema {
  /**
   * String to make chain unique. It is hashed and become genesis.lastBlockHash
   */
  unique: string
  /**
   * Timestamp of chain start represented in UNIX time.
   *
   * @minimum 0
   * @TJS-type integer
   */
  timestamp: number
  /**
   * Initial validator set.
   */
  validatorSet: ValidatorSchema[]
  /**
   * Command to initialize application logic.
   */
  initApp?: string
  /**
   * Command to start application logic.
   */
  startApp: string
}

export interface DappConfig {
  genesisBlock: Block
  initialValidatorSet: ValidatorSet
  initAppCommand?: string
  startAppCommand: string
}

export namespace DappConfig {
  const validator = new Config<DappConfigSchema>(require('./schema/dapp.json'))
  export function validate (config: {}): DappConfig {
    const validated = validator.validate(config)
    const zeroHash = Hash.fromData(validated.unique)
    const initialValidatorSet = new ValidatorSet(validated.validatorSet.map(v => new Validator(Address.fromString(v.address), v.power)))
    const genesisBlock = Block.construct(
      1,
      validated.timestamp,
      zeroHash,
      initialValidatorSet.hash,
      new Hash(Buffer.alloc(32)),
      new TransactionList([]),
      new Consensus(new Vote(0, 1, zeroHash), [])
    )
    return {
      genesisBlock,
      initialValidatorSet,
      initAppCommand: validated.initApp,
      startAppCommand: validated.startApp
    }
  }
}
