import { Port, startApp, startEasy } from './starter'
import debug from 'debug'

// set logger enable
debug.enable('chain-core*,easy*,app*,p2p*')

async function start () {
  const node: Port = { gateway: 8080, app: 56080, api: 56010, memcached: 56011 }
  startApp(node)
  await startEasy(node, true)
}

start().catch(err => console.log(err))
