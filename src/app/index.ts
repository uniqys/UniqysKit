import fs from 'fs'
import meow from 'meow'
import { initialize } from './init'
import { main } from './sample/in-process'

const cli = meow(`
    Usage
      $ uniqys <command> [options]

    Commands
      init      Initialize genesis block
      start     Start Uniqys
      version   Show version
      license   Show license
      help      Show this help

    Options
      --help, -h       Show this help

    Start options
      --port, -p       Number of port

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

  switch (cli.input[0]) {
    case 'help':
      cli.showHelp()
      break
    case 'start':
      main().catch(err => { setImmediate(() => { throw err }) })
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
