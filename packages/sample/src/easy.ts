import { URL } from 'url'
import { promisify } from 'util'

import debug from 'debug'
import MemDown from 'memdown'
import PeerInfo from 'peer-info'

import { Blockchain, BlockStore } from '@uniqys/blockchain'
import { Easy } from '@uniqys/easy-framework'
import { ValidatorNode } from '@uniqys/chain-core'
import { LevelDownStore } from '@uniqys/store'

import { GenesisConfig } from './config/genesis-config'
import { KeyConfig } from './config/key-config'

// set logger enable
debug.enable('validator,sample,chain-core*,p2p*,easy*')
const logger = debug('easy')

async function start (app: string, gateway: number, innerApi: number, innerMemcachedCompatible: number) {
  // load config
  const genesis = await new GenesisConfig().loadAsBlock('./config/genesis.json')
  const peerInfo = await promisify(PeerInfo.create)()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
  const keyPair = await new KeyConfig().loadAsKeyPair('./config/validatorKey.json')
  // state store
  const stateStore = new LevelDownStore(new MemDown())
  const chainStore = new LevelDownStore(new MemDown())
  logger('make it easy: %s', app)
  const easy = new Easy(new URL(app), stateStore, (dapp) =>
    new ValidatorNode(dapp, new Blockchain(new BlockStore(chainStore), genesis), peerInfo, keyPair)
  )
  logger('listen gateway: %d', gateway)
  logger('listen inner api: %d', innerApi)
  logger('listen inner memcached compatible: %d', innerMemcachedCompatible)
  easy.gateway().listen(gateway)
  easy.innerApi().listen(innerApi)
  easy.innerMemcachedCompatible().listen(innerMemcachedCompatible)
  await easy.start()
}

start(
  'http://localhost:56080',
  8080,
  56010,
  56011
).catch(err => console.log(err))
