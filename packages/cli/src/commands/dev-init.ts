/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { KeyPair } from '@uniqys/signature'
import { DappConfigSchema, KeySchema, NodeConfig } from '../config'
import { CommandModule } from 'yargs'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs-extra'

const command: CommandModule = {
  command: 'dev-init',
  describe: 'Initialize dapp and one validator node for develop',
  builder: args => args
    .option('dapp', {
      default: 'dapp.json',
      describe: 'Path to dapp config file',
      type: 'string'
    })
    .option('config', {
      default: 'uniqys.json',
      describe: 'Path to config file',
      type: 'string'
    })
    .option('key', {
      default: 'validatorKey.json',
      describe: 'Path to validator key',
      type: 'string'
    })
    .option('data', {
      default: '.data',
      describe: 'Path to data directory',
      type: 'string'
    })
    .option('force', {
      alias: 'f',
      default: false,
      describe: 'Allow rewriting existing files',
      type: 'boolean'
    }),
  handler: async argv => {
    const configPath = path.join(process.cwd(), argv.config)
    const dappPath = path.join(process.cwd(), argv.dapp)
    const keyPath = path.join(process.cwd(), argv.key)
    const dataDir = path.join(process.cwd(), argv.data)

    // check existing files
    if (!argv.force) {
      if (fs.existsSync(dappPath)) {
        console.log(`'${dappPath}' already exists.`)
        return
      }
      if (fs.existsSync(configPath)) {
        console.log(`'${configPath}' already exists.`)
        return
      }
      if (fs.existsSync(keyPath)) {
        console.log(`'${keyPath}' already exists.`)
        return
      }
      if (fs.existsSync(dataDir) && (!fs.statSync(dataDir).isDirectory() || fs.readdirSync(dataDir).length !== 0)) {
        console.log(`'${dataDir}' already exists and is not empty directory.`)
        return
      }
    }

    const privateKey = KeyPair.generatePrivateKey()
    const keyPair = new KeyPair(privateKey)
    const validatorSet = [{ address: keyPair.address.toString(), power: 1 }]

    const dapp: DappConfigSchema = {
      unique: crypto.randomBytes(40).toString('hex'),
      timestamp: Math.floor(new Date().getTime() / 1000),
      validatorSet: validatorSet,
      initApp: '',
      startApp: 'echo "no start command specified"'
    }
    const config = Object.assign({}, NodeConfig.defaults, {
      dapp: path.relative(configPath, dappPath),
      dataDir: path.relative(configPath, dataDir),
      validatorKey: path.relative(configPath, keyPath)
    })
    const key: KeySchema = {
      privateKey: privateKey.buffer.toString('hex'),
      publicKey: keyPair.publicKey.buffer.toString('hex'),
      address: keyPair.address.toString()
    }

    fs.writeJsonSync(configPath, config, { spaces: 2 })
    fs.writeJsonSync(dappPath, dapp, { spaces: 2 })
    fs.writeJsonSync(keyPath, key, { spaces: 2 })
    fs.emptyDirSync(dataDir)
  }
}

export default command
