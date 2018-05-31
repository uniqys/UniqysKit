import fs from 'fs'
import meow from 'meow'
import { initialize } from './init'

const cli = meow(`
    Usage
      $ uniqys <command> [options]

    Commands
      init      Initialize genesis block
      start     Start uniqys node
      version   Show version
      license   Show license
      help      Show this help

    Options
      --port, -p       Number of port
      --help, -h       Show this help

    Initialize options
      --unique <value>     String to make chain unique
      --timestamp <value>  Timestamp of chain start represented in UNIX time
      --address <value>    Address of validator
      --power <value>      Vote power of validator
`, {
  flags: {
    port: {
      type: 'string',
      alias: 'p'
    },
    // Duplicated with the command. But specified for accessibility.
    help: {
      type: 'boolean',
      alias: 'h'
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

  if (cli.flags.port) {
    // TODO: 書く
  }

  switch (cli.input[0]) {
    case 'help':
      cli.showHelp()
      break
    case 'start':
      // TODO: Start
      break
    case 'version':
      console.log(require('../package').version)
      break
    case 'license':
      console.log(fs.readFileSync(__dirname + '/../LICENSE').toString())
      break
    case 'init':
      initialize(cli.flags)
  }
}
