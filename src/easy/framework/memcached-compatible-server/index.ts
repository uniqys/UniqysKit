import net from 'net'
import { MemcachedTextProtocol } from './handler'
import { MemcachedSubset, Options } from './implementation'
import { Store } from '../../../store/common'

export { Options }

export class MemcachedCompatibleServer extends net.Server {
  constructor (
    store: Store<Buffer, Buffer>,
    /* istanbul ignore next: default parameter */
    options: Options = {}
  ) {
    const impl = new MemcachedSubset(store, options)
    super(socket => new MemcachedTextProtocol(socket, impl).handle())
  }
}
