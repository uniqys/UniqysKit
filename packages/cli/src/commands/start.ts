/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { Easy } from '@uniqys/easy-framework'
import { Blockchain, BlockStore } from '@uniqys/blockchain'
import { LevelDownStore } from '@uniqys/store'
import { DappConfig, NodeConfig, Key } from '../config'
import { CommandModule } from 'yargs'
import { promisify } from 'util'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import leveldown from 'leveldown'
import PeerInfo from 'peer-info'

// set logger enable
import debug from 'debug'
debug.enable('chain-core*,easy*,p2p*')

const command: CommandModule = {
  command: 'start [config]',
  describe: 'Start Easy node',
  builder: args => args
    .positional('config', {
      default: 'uniqys.json',
      describe: 'Path to config file',
      type: 'string'
    }),
  handler: async argv => {
    const configPath = path.join(process.cwd(), argv.config)
    const config = NodeConfig.validate(fs.readJsonSync(configPath))
    const keyPath = path.resolve(path.dirname(configPath), config.validatorKey)
    const keyPair = config.validatorKey !== '' ? Key.validate(fs.readJsonSync(keyPath)) : undefined
    const dappPath = path.resolve(path.dirname(configPath), config.dapp)
    const dappCwd = path.dirname(dappPath)
    const dappConfig = DappConfig.validate(fs.readJsonSync(dappPath))

    const dataDir = path.resolve(path.dirname(configPath), config.dataDir)
    if (!fs.existsSync(dataDir)) {
      throw new Error(`${dataDir} does not exist.`)
    }
    const stateStore = new LevelDownStore(new leveldown(path.join(dataDir, 'state')))
    const chainStore = new LevelDownStore(new leveldown(path.join(dataDir, 'chain')))
    const blockchain = new Blockchain(new BlockStore(chainStore), dappConfig.genesisBlock, dappConfig.initialValidatorSet)
    const peerInfo = await promisify(PeerInfo.create)()
    const eventProvider = dappConfig.eventProvider
      ? (() => {
        const EventProvider = require(dappConfig.eventProvider.package).default
        return new EventProvider(dappCwd, dappConfig.eventProvider.options)
      })()
      : undefined
    const easy = new Easy(blockchain, stateStore, peerInfo, keyPair, eventProvider, config)

    // listen easy apis
    await easy.listen()

    const apiInfo = easy.innerApi.address()
    const memcachedInfo = easy.innerMemcached.address()
    if (typeof apiInfo === 'string') throw new Error('UNIX domain socket is unexpected')
    if (typeof memcachedInfo === 'string') throw new Error('UNIX domain socket is unexpected')

    // run start command with env
    const startAppCommandSplitted = dappConfig.startAppCommand.split(' ')
    const startAppCommandMain = startAppCommandSplitted[0]
    const startAppCommandArgs = startAppCommandSplitted.slice(1)
    const appProcess = spawn(startAppCommandMain, startAppCommandArgs, {
      cwd: dappCwd,
      env: Object.assign({}, process.env, {
        'EASY_APP_HOST': easy.options.app.host,
        'EASY_APP_PORT': easy.options.app.port.toString(),
        'EASY_API_HOST': apiInfo.address,
        'EASY_API_PORT': apiInfo.port.toString(),
        'EASY_MEMCACHED_HOST': memcachedInfo.address,
        'EASY_MEMCACHED_PORT': memcachedInfo.port.toString()
      })
    })
    appProcess.stdout.on('data', (data) => {
      console.log(`${data}`)
    })
    appProcess.stderr.on('data', (data) => {
      console.log(`${data}`)
    })
    process.on('exit', () => {
      appProcess.kill()
    })

    // start core
    await easy.start()
  }
}

export default command
