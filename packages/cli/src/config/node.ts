import { Config } from '@uniqys/config-validator'
import { Options, EasyOptions } from '@uniqys/easy-framework'

export interface NodeConfig extends Partial<Options> {
  /**
   * Path to dapp config file.
   */
  dapp: string
  /**
   * Path to data directory.
   */
  dataDir: string
  /**
   * Path to validator key file.
   */
  validatorKey: string
}

export namespace NodeConfig {
  const validator = new Config<NodeConfig>(require('./schema/node.json'))
  export function validate (config: {}): NodeConfig {
    return validator.validate(config)
  }

  const { gateway, app, innerApi, innerMemcached } = EasyOptions.defaults
  export const defaults: NodeConfig = {
    dapp: 'dapp.json',
    dataDir: '.data',
    validatorKey: '',
    easy: {
      gateway,
      app,
      innerApi,
      innerMemcached
    },
    network: {
      port: 5665,
      address: '0.0.0.0'
    }
  }
}
