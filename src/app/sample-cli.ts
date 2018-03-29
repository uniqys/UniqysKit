import { Dapp, AppState } from '../interface/dapi'
import { ValidatorNode } from '../chain-core/validator'
import { KeyPair, Hash } from '../cryptography'
import { Transaction, TransactionData } from '../chain-core/blockchain'
import repl, { REPLServer } from 'repl'
import { GenesisConfig } from '../config/genesis'
import { KeyConfig } from '../config/key'

class CliApp implements Dapp {
  private height: number = 0
  private transactions: Transaction[]
  private keyPair: KeyPair
  private nonce: number
  constructor (
  ) {
    this.transactions = []
    this.keyPair = new KeyPair()
    console.log(`app address: ${this.keyPair.address}`)
    this.nonce = 0
  }

  public connect (): Promise<AppState> {
    return Promise.resolve(this.appState)
  }

  public async execute (transactions: Transaction[]): Promise<AppState> {
    for (const tx of transactions) {
      this.transactions.push(tx)
    }
    this.height++
    return this.appState
  }
  makeTransaction (data: Buffer | string): Transaction {
    this.nonce++
    const buffer = data instanceof Buffer ? data : new Buffer(data)
    const txd = new TransactionData(this.nonce, buffer)
    return txd.sign(this.keyPair)
  }

  private get appState (): AppState {
    return new AppState(this.height, Hash.fromData(`${this.transactions.length}`))
  }
}

async function start () {
  // load config
  const genesis = await new GenesisConfig().loadAsBlock('./config/genesis.json')
  const keyPair = await new KeyConfig().loadAsKeyPair('./config/validatorKey.json')
  const dapp = new CliApp()
  const validator = new ValidatorNode(dapp, genesis, keyPair)

  // start
  const replServer = repl.start()
  validator.start()

  // commands
  replServer.defineCommand('makeMessageTx', {
    help: 'make transaction include message string',
    action (this: REPLServer, message: string) {
      validator.addTransaction(dapp.makeTransaction(message))
      this.displayPrompt()
    }
  })
  replServer.defineCommand('readMessageTx', {
    help: 'reed messages in transactions of height',
    action (this: REPLServer, heightString: string) {
      let height = parseInt(heightString, 10)
      if (Number.isNaN(height)) {
        console.log('unrecognized block height. show latest block transactions.')
        height = validator.blockchain.height
      }
      console.log(validator.blockchain.blockOf(height).data.transactions.items.map(tx => tx.data.data.toString()))
      this.displayPrompt()
    }
  })

  // context objects
  replServer.context.makeTransaction = (data: Buffer) => { validator.addTransaction(dapp.makeTransaction(data)) }
  replServer.context.blockchain = validator.blockchain

  // exit
  replServer.on('exit', () => {
    validator.stop()
  })
}

start().catch((err) => { throw err })
