import levelup from 'levelup'
import memdown from 'memdown'
import semaphore from 'semaphore'
import { Block } from './blockchain'
import { Hash } from '../cryptography'

interface IBlockDatabaseOps {
  db: string,
  type: string,
  key: string,
  keyEncoding?: string,
  value: string,
  valueEncoding?: string
}

export interface IChainHead {
  height: number,
  lastBlockHash: Hash
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
        key: block.hash.toString(),
        keyEncoding: 'string',
        // FIXME ちゃんとserializeする
        value: JSON.stringify(block),
        valueEncoding: 'string'
      })

      this.blockDatabaseOps.push({
        db: 'block',
        type: 'put',
        key: 'head',
        keyEncoding: 'string',
        // FIXME ちゃんとserializeする
        value: JSON.stringify({
          height: block.header.height,
          lastBlockHash: block.hash
        }),
        valueEncoding: 'json'
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

  public getLastBlock (): Promise<Block> {
    return this.getHead()
      .then((head: IChainHead) => {
        return this.blockDatabase.get(head.lastBlockHash.toString())
      })
      .then((buf: Buffer) => {
        return JSON.parse((buf.toString()))
      })
  }

  public getLastBlockHash (): Promise<Hash> {
    return this.getLastBlock()
      .then((lastBlock: Block) => {
        return lastBlock.hash
      })
  }

  public getHeight (): Promise<number> {
    return this.getHead()
      .then((head: IChainHead) => {
        return head.height
      })
  }

  public getHead (): Promise<IChainHead> {
    return this.blockDatabase.get('head')
      .then((buf: Buffer) => {
        return JSON.parse((buf.toString()))
      })
  }

  private batchDatabaseOps (): Promise<any> {
    if (!this.isLocked()) {
      return Promise.reject(new Error('do not use database without lock.'))
    }
    return this.blockDatabase.batch(this.blockDatabaseOps)
  }
}
