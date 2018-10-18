import { App } from './app'

// set logger enable
import debug from 'debug'
debug.enable('chain-core*,easy*,app*')
const logger = debug('app')

const port = 56080

function startApp () {
  new App('localhost:56010', 'localhost:56011').listen(port)
}

(async () => {
  startApp()
  logger(`Application Port: ${port}`)
  logger(`Ready to serve!`)
})().catch(err => console.log(err))
