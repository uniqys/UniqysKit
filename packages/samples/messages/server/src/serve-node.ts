import { Port, startApp, startEasy } from './starter'
import debug from 'debug'

// set logger enable
debug.enable('chain-core*,easy*,app*,p2p*')

async function start () {
  const node: Port = { gateway: 8090, app: 56090, api: 56020, memcached: 56021 }
  startApp(node)
  await startEasy(node, false)
}

start().catch(err => console.log(err))
