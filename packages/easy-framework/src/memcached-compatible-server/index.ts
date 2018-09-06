import net from 'net'
import { MemcachedTextProtocol } from './handler'
import { MemcachedSubset, Options } from './implementation'
import { Store } from '@uniqys/store'

export { Options }

export class MemcachedCompatibleServer extends net.Server {
  constructor (
    store: Store<Buffer, Buffer>,
    lock: <T>(task: () => Promise<T>) => Promise<T>,
    /* istanbul ignore next: default parameter */
    options: Options = {}
  ) {
    const impl = new MemcachedSubset(store, lock, options)
    super(socket => new MemcachedTextProtocol(socket, impl).handle())
  }
}
