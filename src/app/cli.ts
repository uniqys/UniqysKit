import { KeyPair } from '../structure/cryptography'
import { TransactionData } from '../structure/blockchain'
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
      const txd = new TransactionData(nonce, new Buffer(message))
      nonce++
      core.sendTransaction(txd.sign(signer))
        .then(() => this.displayPrompt())
        .catch(err => { setImmediate(() => { throw err }) })
    }
  })

  // context objects
  replServer.context.core = core
  replServer.context.dapp = dapp

  return replServer
}
