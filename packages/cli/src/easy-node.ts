import { URL } from 'url'
import MemDown from 'memdown'

import { Block, Blockchain, BlockStore } from '@uniqys/blockchain'
import { Easy } from '@uniqys/easy-framework'
import { Local } from '@uniqys/chain-core-dev'
import { LevelDownStore } from '@uniqys/store'
import { KeyPair } from '@uniqys/signature'
import { ConfigSchema } from './config'

// set logger enable
import debug from 'debug'
debug.enable('easy-node*,chain-core*,easy*,app*')
const logger = debug('easy-node')

export class EasyNode {
  constructor (
    public readonly config: ConfigSchema,
    public readonly keyPair: KeyPair,
    public readonly genesis: Block
  ) {}

  public async start () {
    // state store
    const stateStore = new LevelDownStore(new MemDown())
    const chainStore = new LevelDownStore(new MemDown())
    const easy = new Easy(new URL(this.config.appUrl), stateStore, (dapp) =>
      new Local(dapp, new Blockchain(new BlockStore(chainStore), this.genesis), this.keyPair)
    )

    easy.gateway().listen(this.config.gatewayPort)
    easy.innerApi().listen(this.config.innerApiPort)
    easy.innerMemcachedCompatible().listen(this.config.memcachedPort)

    logger('Gateway Port: ' + this.config.gatewayPort)
    logger('API Port: ' + this.config.innerApiPort)
    logger('Memcached Port: ' + this.config.memcachedPort)

    await easy.start()
  }
}
