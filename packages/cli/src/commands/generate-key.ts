/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import { KeyPair } from '@uniqys/signature'
import { KeySchema } from '../config'
import { CommandModule } from 'yargs'
import path from 'path'
import fs from 'fs-extra'

const command: CommandModule = {
  command: 'gen-key [out]',
  describe: 'Generate key file',
  builder: args => args
    .positional('out', {
      default: 'key.json',
      describe: 'Path for generated key',
      type: 'string'
    }),
  handler: async argv => {
    const outPath = path.join(process.cwd(), argv.out)
    if (fs.existsSync(outPath)) {
      console.log(`'${outPath}' already exists.`)
      return
    }
    const privateKey = KeyPair.generatePrivateKey()
    const keyPair = new KeyPair(privateKey)
    const key: KeySchema = {
      privateKey: privateKey.buffer.toString('hex'),
      publicKey: keyPair.publicKey.buffer.toString('hex'),
      address: keyPair.address.toString()
    }
    fs.writeJsonSync(outPath, key, { spaces: 2 })

    console.log(`${argv.out} created successfully.`)
  }
}

export default command
