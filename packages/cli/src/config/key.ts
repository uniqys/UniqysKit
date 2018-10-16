import { Config } from '@uniqys/config-validator'
import { KeyPair } from '@uniqys/signature'
import { Bytes32 } from '@uniqys/types'

import { KeySchema } from './key-schema'

export class KeyConfig extends Config<KeySchema> {
  constructor () { super(require('./schema/key-schema.json')) }

  private asKeyPair (config: KeySchema): KeyPair {
    return new KeyPair(new Bytes32(Buffer.from(config.privateKey, 'hex')))
  }

  public validateAsKeyPair (config: {}): KeyPair {
    return this.asKeyPair(this.validate(config))
  }
}
