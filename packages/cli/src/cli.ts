#!/usr/bin/env node
/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import yargs from 'yargs'

import init from './commands/init'
import start from './commands/start'
import genKey from './commands/generate-key'
import dappConf from './commands/generate-dapp-config'
import genesis from './commands/generate-genesis-hash'
import devInit from './commands/dev-init'

yargs
  .scriptName('uniqys')
  .usage('Usage: $0 <command>')
  .command(init)
  .command(start)
  .command(genKey)
  .command(genesis)
  .command(dappConf)
  .command(devInit)
  .demandCommand()
  .help().alias('h', 'help')
  .version().alias('v', 'version')
  .epilog("Use 'uniqys <command> --help' for description of a command.")
  .wrap(null)
  .strict()
  .parse()
