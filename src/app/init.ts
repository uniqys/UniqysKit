import fs from 'fs'
import path from 'path'
import yargs = require('yargs')
import { KeyPair } from '../cryptography'
import { Genesis } from '../config/schema-generated/genesis'
import { Key } from '../config/schema-generated/key'

const opt = yargs
  .option('unique', {
    describe: 'String to make chain unique.',
    type: 'string'
  })
  .option('timestamp', {
    describe: 'Timestamp of chain start represented in UNIX time.',
    type: 'number',
    default: Math.floor(new Date().getTime() / 1000)
  })
  .option('address', {
    describe: 'Address of validator.',
    type: 'string'
  })
  .option('power', {
    describe: 'Vote power of validator.',
    type: 'string',
    default: 1
  })
  .demandOption(['unique'])
  .argv

const CONFIG = './config'

if (!opt.address) {
  const privateKey = KeyPair.generatePrivateKey()
  const keyPair = new KeyPair(privateKey)
  opt.address = keyPair.address.toString()
  const key: Key = {
    privateKey: privateKey.buffer.toString('hex')
  }
  fs.writeFileSync(path.join(CONFIG, 'validatorKey.json'), JSON.stringify(key, null, 2))
}

const genesis: Genesis = {
  unique: opt.unique,
  timestamp: opt.timestamp,
  validatorSet: [
    {
      address: opt.address,
      power: opt.power
    }
  ]
}
fs.writeFileSync(path.join(CONFIG, 'genesis.json'), JSON.stringify(genesis, null, 2))
