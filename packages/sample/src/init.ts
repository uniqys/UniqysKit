import fs from 'fs'
import path from 'path'
import * as buildOptions from 'minimist-options'

import { KeyPair } from '@uniqys/signature'

import { Genesis } from './config/genesis'
import { Key } from './config/key'

export function initialize (flags: buildOptions.Options): void {
  const CONFIG = './config'

  if (!fs.existsSync(CONFIG)) {
    fs.mkdirSync(CONFIG)
    console.log(`Create ${CONFIG}`)
  }

  let address = flags.address as string

  if (!address) {
    let privateKey = KeyPair.generatePrivateKey()
    let keyPair = new KeyPair(privateKey)
    address = keyPair.address.toString()
    let key: Key = {
      privateKey: privateKey.buffer.toString('hex')
    }
    let filePath = path.join(CONFIG, 'validatorKey.json')
    console.log(`Write validator key into ${filePath}`)
    fs.writeFileSync(filePath, JSON.stringify(key, null, 2))
  }

  const genesis: Genesis = {
    unique: flags.unique as string,
    timestamp: parseInt(flags.timestamp as string, 10),
    validatorSet: [
      {
        address: address,
        power: parseInt(flags.power as string, 10)
      }
    ]
  }

  let filePath = path.join(CONFIG, 'genesis.json')

  console.log(`Write genesis into ${filePath}`)
  fs.writeFileSync(filePath, JSON.stringify(genesis, null, 2))
}
