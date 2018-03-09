import * as levelup from 'levelup'
import * as memdown from 'memdown'

class Database {

  blockDB: any

  constructor (options: any) {
    this.blockDB = options.blockDB ? options.blockDB : levelup(memdown())
  }
}
