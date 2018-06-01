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
    timestamp: flags.timestamp as number,
    validatorSet: [
      {
        address: address,
        power: flags.power as number
      }
    ]
  }

  let filePath = path.join(CONFIG, 'genesis.json')

  console.log(`Write genesis into ${filePath}`)
  fs.writeFileSync(filePath, JSON.stringify(genesis, null, 2))
}
