// ここをUniqys Node Serverのメイン拠点とする

import debug from 'debug'
import repl from 'repl'
import vm from 'vm'
import { Options } from 'minimist-options'
import { Address } from '../structure/address'
import { MerkleizedDbServer } from '../merkleized-db/memcached-compatible-server'
import { GenesisConfig } from '../config/genesis'
import { KeyConfig } from '../config/key'
import { ValidatorNode } from '../chain-core/validator'
import { Blockchain } from '../structure/blockchain'
import { InMemoryBlockStore } from '../store/block'
import { Sample } from './sample/dapp'
import MemDown from 'memdown'

process.env.DEBUG_HIDE_DATE = 'true'
const logger = debug('UNIQYS')

// set logger enable
debug.enable('UNIQYS,validator,sample,state-db*')

/**
 * command: uniqys start
 *
 * @export start command
 * @param {Options} options
 * Options = {
 *   port: network port
 *   config: config directory path
 * }
 */
export function start (options: Options) {
  logger('Uniqys is starting...')

  startConsole(options)
    .then(() => {
      logger('Welcome to Uniqys Console.')
    })
    .catch((err) => {
      logger(err)
    })
}

async function startConsole (options: Options): Promise<void> {
  console.log(options)
   // init dapp
  const db = new MerkleizedDbServer(MemDown())
  const port = 56010
  db.listen(port)
  const dapp = new Sample(`localhost:${port}`)
   // load config
  const genesis = await new GenesisConfig().loadAsBlock('./config/genesis.json')
  const keyPair = await new KeyConfig().loadAsKeyPair('./config/validatorKey.json')
  const validator = new ValidatorNode(dapp, new Blockchain(new InMemoryBlockStore(), genesis), keyPair)

  validator.start()

  // REPL内で利用できるコンテキスト
  const uniqysContext = {
    uniqys: validator,
    dapp: dapp,
    address: Address
  }

  // start console
  const replServer = repl.start({
    prompt: '> ',
    input: process.stdin,
    output: process.stdout,
    ignoreUndefined: true,
    eval: (code: string, context: any, file: any, callback: Function) => {
      let script = new vm.Script(code)
      let vmContext = vm.createContext(uniqysContext)
      let result = script.runInContext(vmContext)
      let err = null // TODO: handlingしたかったらする
      callback(err, result)
    }
  })

  // exit
  replServer.on('exit', () => {
    logger('Got interrupt. Uniqys is shutting down...')
    process.exit()
  })
}
