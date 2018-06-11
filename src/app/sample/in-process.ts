import { REPLServer } from 'repl'
import { GenesisConfig } from '../../config/genesis'
import { KeyConfig } from '../../config/key'
import { ValidatorNode } from '../../chain-core/validator'
import { Sample } from './dapp'
import * as cli from '../cli'
import debug from 'debug'
import { MerkleizedDbServer } from '../../merkleized-db/memcached-compatible-server'
import MemDown from 'memdown'
import { Blockchain } from '../../structure/blockchain'
import { InMemoryBlockStore } from '../../store/block'

// set logger enable
debug.enable('validator,sample,state-db*')

async function main () {
  // init dapp
  const db = new MerkleizedDbServer(MemDown())
  const port = 56010
  db.listen(port)
  const dapp = new Sample(`localhost:${port}`)
  // load config
  const genesis = await new GenesisConfig().loadAsBlock('./config/genesis.json')
  const keyPair = await new KeyConfig().loadAsKeyPair('./config/validatorKey.json')
  const validator = new ValidatorNode(dapp, new Blockchain(new InMemoryBlockStore(), genesis), keyPair)

  // start
  const replServer = cli.start(validator, dapp)
  validator.start()

  // commands
  replServer.defineCommand('makeMessageTx', {
    help: 'make transaction include message string',
    action (this: REPLServer, message: string) {
      validator.sendTransaction(dapp.makeTransaction(message))
        .then(() => this.displayPrompt())
        .catch(err => { setImmediate(() => { throw err }) })
    }
  })
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
    db.close()
  })
}

main().catch(err => { setImmediate(() => { throw err }) })
