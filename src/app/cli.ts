import { KeyPair } from '../structure/cryptography'
import { TransactionData, Transaction } from '../structure/blockchain/transaction'
import repl from 'repl'
import { Dapp, Core } from '../interface/dapi'

export function start<TCore extends Core, TDapp extends Dapp> (core: TCore, dapp: TDapp): repl.REPLServer {
  const signer = new KeyPair()
  let nonce = 0

  // start
  const replServer = repl.start()

  // define generic commands
  replServer.defineCommand('sendMessageTx', {
    help: 'send transaction include message string',
    action (this: repl.REPLServer, message: string) {
      const txd = new TransactionData(nonce, Buffer.from(message))
      nonce++
      core.sendTransaction(Transaction.sign(signer, txd))
        .then(() => this.displayPrompt())
        .catch(err => { setImmediate(() => { throw err }) })
    }
  })

  replServer.context = {
    core: core,
    dapp: dapp
  }

  return replServer
}
