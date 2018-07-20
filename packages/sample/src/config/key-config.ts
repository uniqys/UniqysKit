import { Config } from '@uniqys/config-loader'
import { KeyPair } from '@uniqys/signature'
import { Bytes32 } from '@uniqys/types'

import { Key } from './key'

export class KeyConfig extends Config<Key> {
  constructor () { super(require('../../config-schema/key.json')) }

  public async loadAsKeyPair (configFile: string): Promise<KeyPair> {
    const config = await this.load(configFile)
    return new KeyPair(new Bytes32(Buffer.from(config.privateKey, 'hex')))
  }
}
