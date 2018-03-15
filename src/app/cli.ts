import { Dapp, Core } from '../chain-core/dapi'
import { ValidatorNode } from '../chain-core/validator'
import { KeyPair, Hash } from '../cryptography'
import { MerkleTree } from '../structure'
import { Consensus, ValidatorSet, Validator, BlockData, BlockHeader, Block, Transaction, TransactionData } from '../chain-core/blockchain'
import repl, { REPLServer } from 'repl'

class CliApp implements Dapp {
  private transactions: Transaction[]
  private keyPair: KeyPair
  private nonce: number
  constructor (
    private readonly core: Core
  ) {
    this.transactions = []
    this.keyPair = new KeyPair()
    console.log(`app address: ${this.keyPair.address}`)
    this.nonce = 0
  }

  executeTransaction (tx: Transaction): void {
    this.transactions.push(tx)
  }
  getAppStateHash (): Hash {
    return Hash.fromData(`${this.transactions.length}`)
  }
  makeTransaction (data: Buffer | string): void {
    this.nonce++
    const buffer = data instanceof Buffer ? data : new Buffer(data)
    const txd = new TransactionData(this.nonce, buffer)
    this.core.sendTransaction(txd.sign(this.keyPair))
  }
}

// genesis
const keyPair = new KeyPair()
const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), new ValidatorSet([new Validator(keyPair.address, 10)]))
const lastBlockHash = Hash.fromData('genesis!')
const state = Hash.fromData('genesis state')
const epoch = 1520825696
const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, data.nextValidatorSet.root, state)
const genesis = new Block(data, header)

const validator = new ValidatorNode(CliApp, genesis, keyPair)

// start
const replServer = repl.start()
validator.start()

// commands
replServer.defineCommand('makeMessageTx', {
  help: 'make transaction include message string',
  action (this: REPLServer, message: string) {
    validator.dapp.makeTransaction(message)
    this.displayPrompt()
  }
})
replServer.defineCommand('readMessageTx', {
  help: 'reed messages in transactions of height',
  action (this: REPLServer, heightString: string) {
    let height = parseInt(heightString, 10)
    if (Number.isNaN(height)) {
      console.log('unrecognized block height. show latest block transactions.')
      height = validator.blockchain.height()
    }
    console.log(validator.blockchain.blockOf(height).data.transactions.items.map(tx => tx.data.data.toString()))
    this.displayPrompt()
  }
})

// context objects
replServer.context.makeTransaction = (data: Buffer) => { validator.dapp.makeTransaction(data) }
replServer.context.blockchain = validator.blockchain

// exit
replServer.on('exit', () => {
  validator.stop()
})
