import { Config } from '@uniqys/config-validator'

import { ConfigSchema } from './config-schema'

export class GeneralConfig extends Config<ConfigSchema> {
  constructor () {
    super(require('./schema/config-schema.json'))
  }
}
