#!/usr/bin/env node
import path from 'path'
import fs from 'fs'
import yargs = require('yargs')

import { KeyPair } from '@uniqys/signature'

import { EasyNode } from './easy-node'
import { ConfigSchema, KeySchema, GenesisSchema, GeneralConfig, KeyConfig, GenesisConfig } from './config'

const CONFIG_DIR = path.join(process.cwd(), '.uniqys')
const CONFIG_PATH = {
  config: path.join(CONFIG_DIR, 'config.json'),
  validatorKey: path.join(CONFIG_DIR, 'validatorKey.json'),
  genesis: path.join(process.cwd(), 'genesis.json')
}

const argv = yargs
  .scriptName('uniqys')
  .usage("Usage: $0 <command>")
  .command('init', 'Initialize configs',
    (yargs) => {
      if (!fs.existsSync(CONFIG_PATH.genesis)) {
        yargs
          .usage('Usage: $0 init [options]')
          .option('unique', {
              alias: 'u',
              describe: 'Unique string for generating genesis block'
            })
          .demandOption(['unique'], 'An unique string must be provided to generate a genesis block.')
      } else {
        yargs.usage('Usage: $0 init')
      }
      return yargs.version(false)
    },
    (argv) => {
      init(argv.unique)
    })
  .command('start', 'Start Easy node', 
    (yargs) => {
      return yargs
        .usage('Usage: $0 start')
        .version(false)
    },
    async () => {
      await start().catch(err => console.error(err.message))
    })
  .command('genkey', 'Generate key',
    (yargs) => {
      return yargs
        .usage('Usage: $0 genkey [option]')
        .option('out', {
            alias: 'o',
            describe: 'Output path for generated key'
          })
        .version(false)
    },
    (argv) => {
      genkey(argv.out)
    })
  .help('h').alias('h', 'help')
  .version('v').alias('v', 'version')
  .epilog("Use 'uniqys <command> --help' for description of a command.")
  .wrap(null)
  .strict()
  .argv

if (!argv._[0]) {
  // Show help on no command
  yargs.showHelp()
}

async function start (): Promise<void> {
  let err: string[] = []
  if (!fs.existsSync(CONFIG_PATH.config)) {
    err.push('Error: Config file does not exist.')
  }
  if (!fs.existsSync(CONFIG_PATH.validatorKey)) {
    // Validator key may not be necessary in later updates.
    err.push('Error: Validator key file does not exist.')
  }
  if (!fs.existsSync(CONFIG_PATH.genesis)) {
    err.push('Error: Genesis file does not exist.')
  }
  if (err.length > 0) {
    err.forEach((msg) => console.error(msg))
    console.error("\nRun init command to generate config files.")
    return
  }

  // Load config files
  const config = new GeneralConfig().validate(require(CONFIG_PATH.config))
  const keyPair = new KeyConfig().validateAsKeyPair(require(CONFIG_PATH.validatorKey))
  const genesis = new GenesisConfig().validateAsBlock(require(CONFIG_PATH.genesis))

  await new EasyNode(config, keyPair, genesis).start()
}

function init (unique: string): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR);
  }

  if (!fs.existsSync(CONFIG_PATH.config)) {
    // Default ports and url
    const network: ConfigSchema = {
      gatewayPort: 8080,
      innerApiPort: 56010,
      memcachedPort: 56011,
      appUrl: 'http://localhost:56080/'
    }
    fs.writeFileSync(CONFIG_PATH.config, JSON.stringify(network, null, 2))
  } else {
    console.error(`${CONFIG_PATH.config} already exists. Skip creating config.json...`)
  }

  let address = ''
  if (!fs.existsSync(CONFIG_PATH.validatorKey)) {
    // Generate key when validatorKey.json does not exist
    const privateKey = KeyPair.generatePrivateKey()
    const keyPair = new KeyPair(privateKey)
    address = keyPair.address.toString()
    const key: KeySchema = {
      privateKey: privateKey.buffer.toString('hex')
    }
    fs.writeFileSync(CONFIG_PATH.validatorKey, JSON.stringify(key, null, 2))
  } else {
    console.error(`${CONFIG_PATH.validatorKey} already exists. Skip creating validatorKey.json...`)
    // Load address from existing validatorKey.json
    address = new KeyConfig().validateAsKeyPair(require(CONFIG_PATH.validatorKey)).address.toString()
  }

  if (unique && !fs.existsSync(CONFIG_PATH.genesis)) {
    // Create genesis only if genesis.json does not exist
    const genesis: GenesisSchema = {
      unique: unique,
      timestamp: Math.floor(new Date().getTime() / 1000),
      validatorSet: [
        {
          address: address,
          power: 1
        }
      ]
    }
    fs.writeFileSync(CONFIG_PATH.genesis, JSON.stringify(genesis, null, 2))
  } else {
    console.error(`${CONFIG_PATH.genesis} already exists. Skip creating genesis.json...`)
  }
}

function genkey(out: string): void {
  const privateKey = KeyPair.generatePrivateKey()
  const keyPair = new KeyPair(privateKey)
  const address = keyPair.address.toString()
  const key: KeySchema = {
    privateKey: privateKey.buffer.toString('hex'),
    publicKey: keyPair.publicKey.buffer.toString('hex'),
    address: address
  }
  if (out) {
    fs.writeFileSync(out, JSON.stringify(key, null, 2))
  } else {
    console.log(JSON.stringify(key, null, 2))
  }
}
