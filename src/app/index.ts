import fs from 'fs'
import meow from 'meow'
import { initialize } from './init'
import * as node from './node'

const cli = meow(`
    Usage
      $ uniqys <command> [options]

    Commands
      init      Initialize genesis block
      start     Start Uniqys Node
      version   Show version
      license   Show license
      help      Show this help

    Options
      --help, -h           Show this help

    Start options
      --port, -p <value>   Number of port (Default: 56010)
      --config <value>     Config Directory (Default: ./config)

    Initialize options
      --unique <value>     String to make chain unique
      --timestamp <value>  Timestamp of chain start represented in UNIX time
      --address <value>    Address of validator
      --power <value>      Vote power of validator
`, {
  flags: {
    // Duplicated with the command. But specified for accessibility.
    help: {
      type: 'boolean',
      alias: 'h'
    },
    // Start Options
    port: {
      type: 'string',
      alias: 'p'
    },
    config: {
      type: 'string'
    },
    // Initialize options
    unique: {
      type: 'string'
    },
    timestamp: {
      type: 'string'
    },
    address: {
      type: 'string'
    },
    power: {
      type: 'string'
    }
  }
})

export function run (): void {
  if (cli.flags.help) {
    return cli.showHelp()
  }

  switch (cli.input[0]) {
    case 'help':
      cli.showHelp()
      break
    case 'start':
      node.start((cli.flags) as node.Options)
      break
    case 'version':
      console.log(require('../package').version)
      break
    case 'license':
      console.log(fs.readFileSync(__dirname + '/../LICENSE').toString())
      break
    case 'init':
      initialize(cli.flags)
      break
    default:
      cli.showHelp()
  }
}
