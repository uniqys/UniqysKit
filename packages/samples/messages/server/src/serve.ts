import { App } from './app'

// set logger enable
import debug from 'debug'
debug.enable('app*')
const logger = debug('app')

logger(`Application listen: ${process.env['EASY_APP_HOST']}:${process.env['EASY_APP_PORT']}`)

const api = `${process.env['EASY_API_HOST']}:${process.env['EASY_API_PORT']}`
const db = `${process.env['EASY_MEMCACHED_HOST']}:${process.env['EASY_MEMCACHED_PORT']}`

new App(api, db).listen({ host: process.env['EASY_APP_HOST'], port: process.env['EASY_APP_PORT'] })
logger(`Ready to serve!`)
