#!/usr/bin/env node
import yargs from 'yargs'

import init from './commands/init'
import start from './commands/start'
import genKey from './commands/generate-key'
import dappConf from './commands/generate-dapp-config'
import devInit from './commands/dev-init'

yargs
  .scriptName('uniqys')
  .usage('Usage: $0 <command>')
  .command(init)
  .command(start)
  .command(genKey)
  .command(dappConf)
  .command(devInit)
  .demandCommand()
  .help().alias('h', 'help')
  .version().alias('v', 'version')
  .epilog("Use 'uniqys <command> --help' for description of a command.")
  .wrap(null)
  .strict()
  .parse()
