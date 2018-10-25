import { KeyPair } from '@uniqys/signature'
import { Bytes32 } from '@uniqys/types'
import { Config } from '@uniqys/config-validator'

// TODO: support encryption like web3 secret storage. ref. https://github.com/ethereum/wiki/wiki/Web3-Secret-Storage-Definition
export interface KeySchema {
  /**
   * Hexadecimal plain private key. Must keep it in secure.
   */
  privateKey: string
  /**
   * Public key which pairs with private key. This will not be used in the program and can be ignored.
   */
  publicKey?: string
  /**
   * Address generated from public key. This will not be used in the program and can be ignored.
   */
  address?: string
}

export namespace Key {
  const validator = new Config<KeySchema>(require('./schema/key.json'))
  export function validate (config: {}): KeyPair {
    const validated = validator.validate(config)
    return new KeyPair(new Bytes32(Buffer.from(validated.privateKey, 'hex')))
  }
}
