
import memdown from 'memdown'
import debug from 'debug'
import { Options, MerkleizedDbServer } from '../merkleized-db/memcached-compatible-server'

// set logger enable
debug.enable('state-db*')

function start (port: number, options?: Options) {
  const server = new MerkleizedDbServer(memdown(), options)
  console.log(`listen: ${port}`)
  server.listen(port)
}

start(56010, { useCas: true })
