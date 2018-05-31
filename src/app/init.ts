import fs from 'fs'
import path from 'path'
import * as buildOptions from 'minimist-options'
import { KeyPair } from '../structure/cryptography'
import { Genesis } from '../config/schema-generated/genesis'
import { Key } from '../config/schema-generated/key'

export function initialize (flags: buildOptions.Options): void {
  const CONFIG = './config'

  let address = flags.address as string

  if (!address) {
    const privateKey = KeyPair.generatePrivateKey()
    const keyPair = new KeyPair(privateKey)
    address = keyPair.address.toString()
    const key: Key = {
      privateKey: privateKey.buffer.toString('hex')
    }
    fs.writeFileSync(path.join(CONFIG, 'validatorKey.json'), JSON.stringify(key, null, 2))
  }

  const genesis: Genesis = {
    unique: flags.unique as string,
    timestamp: flags.timestamp as number,
    validatorSet: [
      {
        address: address,
        power: flags.power as number
      }
    ]
  }

  fs.writeFileSync(path.join(CONFIG, 'genesis.json'), JSON.stringify(genesis, null, 2))
}
