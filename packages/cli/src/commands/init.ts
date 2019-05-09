/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { DappConfig, NodeConfig } from '../config'
import { CommandModule } from 'yargs'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs-extra'

const command: CommandModule = {
  command: 'init [dapp]',
  describe: 'Initialize node',
  builder: args => args
    .positional('dapp', {
      default: 'dapp.json',
      describe: 'Path to the dapp config file',
      type: 'string'
    })
    .option('out', {
      alias: 'o',
      default: 'uniqys.json',
      describe: 'Path to generated config file',
      type: 'string'
    })
    .option('data', {
      default: '.data',
      describe: 'Path to data directory',
      type: 'string'
    })
    .option('reset', {
      default: false,
      describe: 'Enable reset non empty data directory.',
      type: 'boolean'
    }),
  handler: argv => {
    const outPath = path.join(process.cwd(), argv.out)
    let dappPath = path.join(process.cwd(), argv.dapp)
    let dataDir = path.join(process.cwd(), argv.data)
    let config = NodeConfig.defaults
    // check existing config file
    if (fs.existsSync(outPath)) {
      config = require(outPath)
      dappPath = path.resolve(path.dirname(outPath), config.dapp)
      dataDir = path.resolve(path.dirname(outPath), config.dataDir)
    } else {
      config.dapp = path.relative(path.dirname(outPath), dappPath)
      config.dataDir = path.relative(path.dirname(outPath), dataDir)
    }

    // ensure dapp conf, data dir, and config is valid
    if (!fs.existsSync(dappPath)) {
      console.log('DApp config does not exist. Run dapp-conf command before init.')
      return
    }
    if (fs.existsSync(dataDir) && (!fs.statSync(dataDir).isDirectory() || fs.readdirSync(dataDir).length !== 0)) {
      console.log(`'${dataDir}' already exists and is not an empty directory.`)
      if (!argv.reset) {
        console.log(`If you want to reset it, use '--reset' flag`)
        return
      }
      console.log(`reset data dir: '${dataDir}`)
    }

    fs.emptyDirSync(dataDir)
    fs.writeJsonSync(outPath, config, { spaces: 2 })

    const dappCwd = path.dirname(dappPath)
    const dappConfig = DappConfig.validate(fs.readJsonSync(dappPath))

    // run initialize command
    if (dappConfig.initAppCommand && dappConfig.initAppCommand !== '') {
      console.log(`init: ${dappConfig.initAppCommand}`)
      execSync(dappConfig.initAppCommand, { cwd: dappCwd })
    }

    console.log(`${argv.out} and ${argv.data} created successfully.`)
  }
}

export default command
