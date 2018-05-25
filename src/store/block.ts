import { BlockStore } from '../structure/blockchain'
import { Block } from '../structure/blockchain/block'
import { AbstractLevelDOWN } from 'abstract-leveldown'
import { serialize, deserialize, UInt64 } from '../structure/serializable'
import semaphore from 'semaphore'
import levelup from 'levelup'

namespace Key {
  const BLOCK_PREFIX = 'b'
  const HEIGHT_KEY = 'h'
  export const height = Buffer.from(HEIGHT_KEY)
  export function block (height: number): Buffer {
    return serialize(height, (h, w) => {
      w.ensure(1).write(BLOCK_PREFIX, 0, 1)
      UInt64.serialize(h, w)
    })
  }
}
export class LevelDownBlockStore implements BlockStore {
  private readonly levelup: levelup.LevelUp<Buffer, Buffer>
  private readonly semaphore: semaphore.Semaphore
  private _height: undefined | number // cache
  constructor (
    db: AbstractLevelDOWN<Buffer, Buffer>
  ) {
    this.levelup = levelup(db)
    this.semaphore = semaphore(1)
  }

  public async get (height: number): Promise<Block> {
    const max = await this.height()
    if (max < height) { throw new Error('height is out of range.') }
    return deserialize(await this.levelup.get(Key.block(height)), Block.deserialize)
  }
  public async height (): Promise<number> {
    if (this._height) { return Promise.resolve(this._height) }
    try {
      return deserialize(await this.levelup.get(Key.height), UInt64.deserialize)
    } catch (err) {
      /* istanbul ignore else: back-end error */
      if (err instanceof levelup.errors.NotFoundError) {
        return 0
      } else {
        throw err
      }
    }
  }
  public push (block: Block): Promise<void> {
    return new Promise((resolve, reject) => this.semaphore.take(async () => {
      try {
        const height = await this.height()
        const newHeight = height + 1
        await this.levelup.put(Key.block(newHeight), serialize(block))
        await this.levelup.put(Key.height, serialize(newHeight, UInt64.serialize))
        this._height = newHeight
        resolve()
      } catch (err) {
        reject(err)
      } finally {
        this.semaphore.leave()
      }
    }))
  }
}

/* istanbul ignore next: it is for test and experiment  */
export class InMemoryBlockStore implements BlockStore {
  private store: Block[] = []
  public async get (height: number): Promise<Block> {
    if (this.store.length < height) { throw new Error('height is out of range.') }
    return Promise.resolve(this.store[height - 1])
  }
  public async height (): Promise<number> {
    return Promise.resolve(this.store.length)
  }
  public async push (block: Block): Promise<void> {
    this.store.push(block)
    return Promise.resolve()
  }
}
