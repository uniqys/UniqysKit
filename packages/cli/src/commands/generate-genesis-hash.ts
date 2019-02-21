/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { DappConfig } from '../config'
import { CommandModule } from 'yargs'
import path from 'path'
import fs from 'fs-extra'

const command: CommandModule = {
  command: 'genesis-hash [dapp]',
  describe: 'Generate genesis hash file',
  builder: args => args
    .positional('dapp', {
      default: 'dapp.json',
      describe: 'Path to dapp config file',
      type: 'string'
    })
    .option('out', {
      alias: 'o',
      default: 'genesisHash.json',
      describe: 'Path to generated key',
      type: 'string'
    }),
  handler: async argv => {
    const outPath = path.join(process.cwd(), argv.out)
    const dappPath = path.join(process.cwd(), argv.dapp)
    const dappConfig = DappConfig.validate(fs.readJsonSync(dappPath))
    const genesisHash = {
      genesisHash: dappConfig.genesisBlock.hash.toHexString()
    }
    fs.writeJsonSync(outPath, genesisHash, { spaces: 2 })
  }
}

export default command
