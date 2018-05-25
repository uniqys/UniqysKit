import { GenesisConfig } from '../../config/genesis'
import { KeyConfig } from '../../config/key'
import { ValidatorNode } from '../../chain-core/validator'
import { GrpcDapp } from '../../interface/rpc/grpc'
import * as cli from '../cli'
import debug from 'debug'
import { REPLServer } from 'repl'
import { Blockchain } from '../../structure/blockchain'
import { InMemoryBlockStore } from '../../store/block'

// set logger enable
debug.enable('validator,grpc')

async function startValidatorNodeOverRpc (address: string, listen: string) {
  // load config
  const genesis = await new GenesisConfig().loadAsBlock('./config/genesis.json')
  const keyPair = await new KeyConfig().loadAsKeyPair('./config/validatorKey.json')
  const grpc = new GrpcDapp(address)
  const validator = new ValidatorNode(grpc, new Blockchain(new InMemoryBlockStore(), genesis), keyPair)
  // serve core
  const server = grpc.serve(validator, listen)
  // start cli
  const replServer = cli.start(validator, grpc)

  // TODO: read by dapp over grpc
  replServer.defineCommand('readMessageTx', {
    help: 'reed messages in transactions of height',
    async action (this: REPLServer, heightString: string) {
      let height = parseInt(heightString, 10)
      if (Number.isNaN(height)) {
        console.log('unrecognized block height. show latest block transactions.')
        height = await validator.blockchain.height
      }
      console.log((await validator.blockchain.blockOf(height)).body.transactionList.transactions.map(tx => tx.data.data.toString()))
      this.displayPrompt()
    }
  })
  // exit
  replServer.on('exit', () => {
    validator.stop()
    server.forceShutdown()
  })

  validator.start() // connect dapp
}

async function start () {
  const core = 'localhost:56001'
  const dapp = 'localhost:56002'
  await startValidatorNodeOverRpc(dapp, core)
}

start().catch(err => { setImmediate(() => { throw err }) })
