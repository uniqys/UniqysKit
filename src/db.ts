import levelup from 'levelup'
import memdown from 'memdown'
import semaphore from 'semaphore'

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
  private semaphore: semaphore.Semaphore
  private blockDatabase: any
  private blockDatabaseOps: Array<IDatabaseOps>

  constructor () {
    this.blockDatabase = levelup(memdown())
    this.blockDatabaseOps = []
    this.semaphore = semaphore(1)
  }

  public touch (fn: semaphore.Task): void {
    this.semaphore.take(() => {
      fn()
    })
  }

  public leave (): void {
    this.semaphore.leave()
  }

  public isLocked (): boolean {
    return this.semaphore.available(1) === false
  }

  public putBlock (block: Block): Promise<void> {
    return new Promise((resolve, reject) => {
      this.blockDatabaseOps.push({
        db: 'block',
        type: 'put',
        key: block.hash(),
        value: block.serialize(),
        valueEncoding: 'binary'
      })
      this.batchDatabaseOps()
        .then(() => {
          resolve()
        })
        .catch(err => {
          reject(err)
        })
    })
  }

  public getBlock (hash: string): Promise <Buffer > {
    return this.blockDatabase.get(hash)
  }

  private batchDatabaseOps (): Promise<any > {
    if (!this.isLocked()) {
      return Promise.reject(new Error('do not use database without lock.'))
    }
    return this.blockDatabase.batch(this.blockDatabaseOps)
  }
}
