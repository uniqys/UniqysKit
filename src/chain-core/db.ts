import levelup from 'levelup'
import memdown from 'memdown'
import semaphore from 'semaphore'
import { Block } from 'chain-core/blockchain'
import { Hash } from 'cryptography'

interface IBlockDatabaseOps {
  db: string,
  type: string,
  key: Hash,
  keyEncoding?: string,
  value: string,
  valueEncoding?: string
}

export class Database {
  private semaphore: semaphore.Semaphore
  private blockDatabase: any
  private blockDatabaseOps: Array<IBlockDatabaseOps>

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

  public addBlock (block: Block): Promise<void> {
    return new Promise((resolve, reject) => {
      this.blockDatabaseOps.push({
        db: 'block',
        type: 'put',
        key: block.hash,
        // FIXME ちゃんとserializeする
        value: JSON.stringify(block),
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

  public getBlock (hash: Hash): Promise <Block> {
    return this.blockDatabase.get(hash)
      .then((buf: Buffer) => {
        let jsonBlock = JSON.parse((buf.toString()))
        return new Block(jsonBlock.data, jsonBlock.header)
      })
  }

  private batchDatabaseOps (): Promise<any> {
    if (!this.isLocked()) {
      return Promise.reject(new Error('do not use database without lock.'))
    }
    return this.blockDatabase.batch(this.blockDatabaseOps)
  }
}
