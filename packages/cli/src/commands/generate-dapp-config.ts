/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { DappConfigSchema } from '../config'
import { CommandModule } from 'yargs'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs-extra'

const command: CommandModule = {
  command: 'dapp-conf [out]',
  describe: 'Generate DApp config file',
  builder: args => args
    .positional('out', {
      default: 'dapp.json',
      describe: 'Path to dapp config file',
      type: 'string'
    })
    .option('validators', {
      alias: 'vs',
      array: true,
      default: [],
      describe: 'Validator list in `address:power` format',
      type: 'string'
    })
    .option('unique', {
      alias: 'u',
      default: crypto.randomBytes(40).toString('hex'),
      describe: 'String to make chain unique',
      type: 'string'
    })
    .option('timestamp', {
      alias: 't',
      default: Math.floor(new Date().getTime() / 1000),
      describe: 'Timestamp of chain start, represented in UNIX time',
      type: 'number'
    }),
  handler: async argv => {
    const outPath = path.join(process.cwd(), argv.out)
    if (fs.existsSync(outPath)) {
      console.log(`'${outPath}' already exists.`)
      return
    }
    const validatorSet = argv.validators.map((s: string) => {
      const [address, power] = s.split(':')
      return { address, power: parseInt(power, 10) }
    })
    const dapp: DappConfigSchema = {
      unique: argv.unique,
      timestamp: argv.timestamp,
      validatorSet: validatorSet,
      eventProvider: '',
      initApp: '',
      startApp: 'echo "no start command specified"'
    }
    fs.writeJsonSync(outPath, dapp, { spaces: 2 })
  }
}

export default command
