import { BlockStore } from '../structure/blockchain'
import { BlockHeader, BlockBody } from '../structure/blockchain/block'
import { AbstractLevelDOWN } from 'abstract-leveldown'
import { serialize, deserialize, UInt64 } from '../structure/serializable'
import semaphore from 'semaphore'
import * as semaphoreUtil from '../utility/semaphore'
import levelup from 'levelup'
import { Consensus } from '../structure/blockchain/consensus'

namespace Key {
  const HEADER_PREFIX = 'h'
  const BODY_PREFIX = 'b'
  const HEIGHT_KEY = 'n'
  const CONSENSUS_KEY = 'c'
  export const height = Buffer.from(HEIGHT_KEY)
  export const consensus = Buffer.from(CONSENSUS_KEY)
  export function header (height: number): Buffer {
    return serialize(height, (h, w) => {
      w.ensure(1).write(HEADER_PREFIX, 0, 1)
      UInt64.serialize(h, w)
    })
  }
  export function body (height: number): Buffer {
    return serialize(height, (h, w) => {
      w.ensure(1).write(BODY_PREFIX, 0, 1)
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

  public lock<T> (task: () => Promise<T>): Promise<T> {
    return semaphoreUtil.takeAsync(this.semaphore, task)
  }

  public async getHeight (): Promise<number> {
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
  public async getLastConsensus (): Promise<Consensus> {
    return deserialize(await this.levelup.get(Key.consensus), Consensus.deserialize)
  }
  public async getHeader (height: number): Promise<BlockHeader> {
    return deserialize(await this.levelup.get(Key.header(height)), BlockHeader.deserialize)
  }
  public async getBody (height: number): Promise<BlockBody> {
    return deserialize(await this.levelup.get(Key.body(height)), BlockBody.deserialize)
  }

  public async setHeight (height: number): Promise<void> {
    await this.levelup.put(Key.height, serialize(height, UInt64.serialize))
    this._height = height
  }
  public async setLastConsensus (consensus: Consensus): Promise<void> {
    await this.levelup.put(Key.consensus, serialize(consensus))
  }
  public async setHeader (height: number, header: BlockHeader): Promise<void> {
    await this.levelup.put(Key.header(height), serialize(header))
  }
  public async setBody (height: number, body: BlockBody): Promise<void> {
    await this.levelup.put(Key.body(height), serialize(body))
  }
}

export class InMemoryBlockStore implements BlockStore {
  private readonly semaphore = semaphore(1)
  private height = 0
  private consensus?: Consensus
  private headers: BlockHeader[] = []
  private bodies: BlockBody[] = []

  public lock<T> (task: () => Promise<T>): Promise<T> {
    return semaphoreUtil.takeAsync(this.semaphore, task)
  }

  public getHeight (): Promise<number> {
    return Promise.resolve(this.height)
  }
  public getLastConsensus (): Promise<Consensus> {
    return this.consensus ? Promise.resolve(this.consensus) : Promise.reject(new Error('not found'))
  }
  public getHeader (height: number): Promise<BlockHeader> {
    return this.headers[height] ? Promise.resolve(this.headers[height]) : Promise.reject(new Error('not found'))
  }
  public getBody (height: number): Promise<BlockBody> {
    return this.bodies[height] ? Promise.resolve(this.bodies[height]) : Promise.reject(new Error('not found'))
  }

  public setHeight (height: number): Promise<void> {
    this.height = height
    return Promise.resolve()
  }
  public setLastConsensus (consensus: Consensus): Promise<void> {
    this.consensus = consensus
    return Promise.resolve()
  }
  public setHeader (height: number, header: BlockHeader): Promise<void> {
    this.headers[height] = header
    return Promise.resolve()
  }
  public setBody (height: number, body: BlockBody): Promise<void> {
    this.bodies[height] = body
    return Promise.resolve()
  }
}
