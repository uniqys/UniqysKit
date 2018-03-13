import levelup from 'levelup'
import memdown from 'memdown'
import semaphore, { Semaphore } from 'semaphore'
import { resolve } from 'path'

interface IDatabaseOps {
  db: string,
  type: string,
  key: string,
  keyEncoding?: string,
  value: string,
  valueEncoding?: string
}

export class Block {
  hash (): string {
    return 'test-hash'
  }
  serialize (): string {
    return 'test-serialize'
  }
}

export class Database {
  blockDatabase: any
  blockDatabaseOps: Array<IDatabaseOps>
  semaphore: Semaphore

  constructor (options: any) {
    this.blockDatabase = options.database ? options.database : levelup(memdown())
    this.blockDatabaseOps = []
    this.semaphore = semaphore(1)
  }

  public putBlock (block: Block): Promise<void> {
    return new Promise((resolve) => {
      this.semaphore.take(() => {
        this.blockDatabaseOps.push({
          db: 'block',
          type: 'put',
          key: block.hash(),
          value: block.serialize(),
          valueEncoding: 'binary'
        })
        this.batchDatabaseOps()
        this.semaphore.leave()
        return resolve()
      })
    })
  }

  public getBlock (hash: string): Promise<Buffer> {
    return this.blockDatabase.get(hash)
  }

  private batchDatabaseOps (): Promise<any> {
    return this.blockDatabase.batch(this.blockDatabaseOps)
  }
}
