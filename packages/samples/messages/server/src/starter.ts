import { Blockchain, BlockStore, GenesisConfig } from '@uniqys/blockchain'
import { Easy } from '@uniqys/easy-framework'
import { Node } from '@uniqys/chain-core'
import { LevelDownStore } from '@uniqys/store'
import { KeyConfig } from '@uniqys/signature'
import { App } from './app'
import { promisify } from 'util'
import { URL } from 'url'
import MemDown from 'memdown'
import PeerInfo from 'peer-info'

export interface Port {
  gateway: number
  app: number
  api: number
  memcached: number
}

export function startApp (port: Port) {
  new App(`localhost:${port.api}`, `localhost:${port.memcached}`).listen(port.app)
}

export async function startEasy (port: Port, isValidator: boolean) {
  // load config
  const [genesis, validators] = new GenesisConfig().validateAsBlockAndValidatorSet(require('../../../config/genesis.json'))
  const keyPair = new KeyConfig().validateAsKeyPair(require('../../../config/validatorKey.json'))
  // state store
  const stateStore = new LevelDownStore(new MemDown())
  const chainStore = new LevelDownStore(new MemDown())
  const peerInfo = await promisify(PeerInfo.create)()
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
  const easy = new Easy(new URL(`http://localhost:${port.app}`), stateStore, (dapp) => {
    const node = new Node(dapp, new Blockchain(new BlockStore(chainStore), genesis, validators), peerInfo, isValidator ? keyPair : undefined)
    node.onError(err => console.log(err))
    return node
  })
  easy.gateway().listen(port.gateway)
  easy.innerApi().listen(port.api)
  easy.innerMemcachedCompatible().listen(port.memcached)
  await easy.start()
}
