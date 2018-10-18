import { Blockchain, BlockStore, ValidatorSet, Validator, Block, TransactionList, Consensus, Vote } from '@uniqys/blockchain'
import { Easy } from '@uniqys/easy-framework'
import { Node } from '@uniqys/chain-core'
import { LevelDownStore } from '@uniqys/store'
import { Hash, KeyPair } from '@uniqys/signature'
import { App } from './app'
import { promisify } from 'util'
import { URL } from 'url'
import MemDown from 'memdown'
import PeerInfo from 'peer-info'
import debug from 'debug'
// set logger enable
debug.enable('chain-core*,easy*,app*,p2p*')

export interface Port {
  gateway: number
  app: number
  api: number
  memcached: number
}

function startApp (port: Port) {
  new App(`localhost:${port.api}`, `localhost:${port.memcached}`).listen(port.app)
}

async function startEasy (port: Port, genesis: Block, validatorSet: ValidatorSet, keyPair: KeyPair) {
  // state store
  const stateStore = new LevelDownStore(new MemDown())
  const chainStore = new LevelDownStore(new MemDown())
  const peerInfo = await promisify(PeerInfo.create)()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
  const easy = new Easy(new URL(`http://localhost:${port.app}`), stateStore, (dapp) => {
    const node = new Node(dapp, new Blockchain(new BlockStore(chainStore), genesis, validatorSet), peerInfo, keyPair)
    node.onError(err => console.log(err))
    return node
  })
  easy.gateway().listen(port.gateway)
  easy.innerApi().listen(port.api)
  easy.innerMemcachedCompatible().listen(port.memcached)
  await easy.start()
}

async function start () {
  // make 4 validators (even power)
  const validators = [...new Array(4)].map(() => new KeyPair())
  const validatorSet = new ValidatorSet(validators.map(key => new Validator(key.address, 100)))

  // make genesis
  const genesis = Block.construct(
    1,
    Math.floor(new Date().getTime() / 1000),
    Hash.fromData('foo'),
    validatorSet.hash,
    new Hash(Buffer.alloc(32)),
    new TransactionList([]),
    new Consensus(new Vote(0, 1, Hash.fromData('foo')), [])
  )

  // start all
  for (let i = 0; i < validators.length - 1; i++) {
    const offset = i * 10
    const port: Port = { gateway: 8080 + offset, app: 56000 + offset, api: 56001 + offset, memcached: 56002 + offset }
    startApp(port)
    startEasy(port, genesis, validatorSet, validators[i]).catch(err => console.log(err))
  }
}

start().catch(err => console.log(err))
