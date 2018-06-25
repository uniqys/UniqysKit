import { GenesisConfig } from '../../config/genesis'
import { Blockchain } from '../../structure/blockchain'
import { InMemoryBlockStore } from '../../store/block'
import { KeyPair } from '../../structure/cryptography'
import { Transaction, TransactionData } from '../../structure/blockchain/transaction'
import { Node } from '../../chain-core/node'
import { promisify } from 'util'
import PeerInfo from 'peer-info'
import repl from 'repl'
import { ValidatorNode } from '../../chain-core/validator'
import { KeyConfig } from '../../config/key'
import { Sample } from './dapp'
import debug from 'debug'
// set logger enable
debug.enable('validator,sample,chain-core*,p2p*')

async function startNode (keyPair?: KeyPair) {
  // init dapp
  const dapp = new Sample()
  // load config
  const genesis = await new GenesisConfig().loadAsBlock('./config/genesis.json')
  const peerInfo = await promisify(PeerInfo.create)()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
  const node = keyPair
    ? new ValidatorNode(dapp, new Blockchain(new InMemoryBlockStore(), genesis), peerInfo, keyPair)
    : new Node(dapp, new Blockchain(new InMemoryBlockStore(), genesis), peerInfo)
  await node.start()
  return node
}

async function startValidator () {
  const keyPair = await new KeyConfig().loadAsKeyPair('./config/validatorKey.json')
  return startNode(keyPair)
}

async function main () {
  // start
  const node = await startNode()
  const validator = await startValidator()
  const replServer = repl.start()

  const signer = new KeyPair()
  let nonce = 0
  replServer.defineCommand('sendMessageTx', {
    help: 'send transaction include message string',
    action (this: repl.REPLServer, message: string) {
      nonce++
      const txd = new TransactionData(nonce, Buffer.from(message))
      node.sendTransaction(Transaction.sign(signer, txd))
        .then(() => this.displayPrompt())
        .catch(err => { setImmediate(() => { throw err }) })
    }
  })

  replServer.context.node = node
  replServer.context.validator = validator
  // exit
  replServer.on('exit', async () => {
    await node.stop()
    await validator.stop()
  })
}

main().catch(err => { setImmediate(() => { throw err }) })
