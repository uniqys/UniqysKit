import { AbstractLevelDOWN } from 'abstract-leveldown'
import levelup from 'levelup'
import semaphore from 'semaphore'
import { MemcachedSubset, Response, Checker } from './handler'
import { Serializer, Deserializer, serialize, deserialize, UInt32, UInt64 } from '../../structure/serializable'

class Item {
  constructor (
    public readonly flags: number,
    public readonly casUniq: number,
    public readonly data: Buffer
  ) {}
  public static deserialize: Deserializer<Item> = (reader) => {
    const casUniq = UInt64.deserialize(reader)
    const flags = UInt32.deserialize(reader)
    return new Item(flags, casUniq, reader.buffer)
  }
  public static noCasDeserialize: Deserializer<Item> = (reader) => {
    const flags = UInt32.deserialize(reader)
    return new Item(flags, 0, reader.buffer)
  }

  public static serialize: Serializer<Item> = (item, writer) => {
    UInt64.serialize(item.casUniq, writer)
    UInt32.serialize(item.flags, writer)
    writer.append(item.data)
  }
  public static noCasSerialize: Serializer<Item> = (item, writer) => {
    // skip cas
    UInt32.serialize(item.flags, writer)
    writer.append(item.data)
  }
}

export interface Options {
  useCas?: boolean
}

export class LevelDownMemcachedSubset implements MemcachedSubset {
  private readonly levelup: levelup.LevelUp<Buffer, Buffer>
  private readonly useCas: boolean
  private readonly semaphore: semaphore.Semaphore
  private readonly itemSerializer: Serializer<Item>
  private readonly itemDeserializer: Deserializer<Item>
  constructor (
    db: AbstractLevelDOWN<Buffer, Buffer>,
    options: Options = {}
  ) {
    this.levelup = levelup(db)
    this.useCas = options.useCas || false
    this.semaphore = semaphore(1)
    if (this.useCas) {
      this.itemSerializer = Item.serialize
      this.itemDeserializer = Item.deserialize
    } else {
      this.itemSerializer = Item.noCasSerialize
      this.itemDeserializer = Item.noCasDeserialize
    }
  }
  public set (keyString: string, flags: number, data: Buffer): Promise<Response.Stored> {
    const key = Buffer.from(keyString, 'utf8')
    return new Promise<Response.Stored>((resolve, reject) => this.semaphore.take(async () => {
      try {
        let casUniq = 0
        // skip get if disable use of Cas
        if (this.useCas) {
          try {
            casUniq = deserialize(await this.levelup.get(key), this.itemDeserializer).casUniq
          } catch (err) {
            if (!(err instanceof levelup.errors.NotFoundError)) { throw err }
          }
        }
        await this.levelup.put(key, serialize(new Item(flags, casUniq + 1, data), this.itemSerializer))
        resolve(Response.Stored)
      } catch (err) {
        reject(err)
      } finally {
        this.semaphore.leave()
      }
    }))
  }
  public add (keyString: string, flags: number, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item === undefined) {
        await this.levelup.put(key, serialize(new Item(flags, 1, data), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public replace (keyString: string, flags: number, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.levelup.put(key, serialize(new Item(flags, item.casUniq + 1, data), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public append (keyString: string, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.levelup.put(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.concat([item.data, data])), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public prepend (keyString: string, data: Buffer): Promise<Response.Stored | Response.NotStored> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.levelup.put(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.concat([data, item.data])), this.itemSerializer))
        return Response.Stored
      } else {
        return Response.NotStored
      }
    })
  }
  public cas (keyString: string, flags: number, casUniq: number, data: Buffer): Promise<Response.Stored | Response.Exists | Response.NotFound> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        if (item.casUniq === casUniq) {
          await this.levelup.put(key, serialize(new Item(flags, item.casUniq + 1, data), this.itemSerializer))
          return Response.Stored
        } else {
          return Response.Exists
        }
      } else {
        return Response.NotFound
      }
    })
  }
  public async *get (keys: string[]): AsyncIterable<Response.Value> {
    for await (const valS of this.gets(keys)) {
      yield { key: valS.key, flags: valS.flags, data: valS.data }
    }
  }
  public async *gets (keys: string[]): AsyncIterable<Response.ValueS> {
    for (const keyString of keys) {
      const key = Buffer.from(keyString, 'utf8')
      let item: Item | undefined
      try {
        item = deserialize(await this.levelup.get(key), this.itemDeserializer)
      } catch (err) {
        if (!(err instanceof levelup.errors.NotFoundError)) { throw err }
      }
      if (item !== undefined) {
        yield { key: keyString, flags: item.flags, data: item.data, cas: item.casUniq }
      }
    }
  }
  public async delete (keyString: string): Promise<Response.NotFound | Response.Deleted> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        await this.levelup.del(key)
        return Response.Deleted
      } else {
        return Response.NotFound
      }
    })
  }
  public incr (keyString: string, value: number): Promise<Response.Number | Response.NotFound> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        const count = parseInt(item.data.toString(), 10)
        // On real memcached, count saturate to max 64bit uint (2^64 - 1).
        // But on this implementation, it is MAX_SAFE_INTEGER (2^53 - 1) in javascript
        const newCount = Math.min(count + value, Number.MAX_SAFE_INTEGER)
        await this.levelup.put(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.from(newCount.toString(10))), this.itemSerializer))
        return newCount
      } else {
        return Response.NotFound
      }
    })
  }
  public decr (keyString: string, value: number): Promise<Response.Number | Response.NotFound> {
    return this.getAndAct(keyString, async (key, item) => {
      if (item !== undefined) {
        const count = parseInt(item.data.toString(), 10)
        const newCount = Math.max(count - value, 0)
        await this.levelup.put(key, serialize(new Item(item.flags, item.casUniq + 1, Buffer.from(newCount.toString(10))), this.itemSerializer))
        return newCount
      } else {
        return Response.NotFound
      }
    })
  }
  public async *stats (...args: any[]): AsyncIterable<Response.Stat> {
    // TODO: return some useful information
    if (args.length > 0) { throw new Checker.CheckError('unsupported argument') }
    return undefined
  }
  public flush (): Promise<Response.Ok> {
    throw new Error('Method not implemented.')
  }
  public version (): Promise<Response.Version> {
    return Promise.resolve({ version: '0' })
  }
  public verbosity (_level: number): Promise<Response.Ok> {
    // TODO: set logger enable
    return Promise.resolve<Response.Ok>(Response.Ok)
  }
  public quit (): Promise<void> {
    return Promise.resolve()
  }
  private getAndAct<T> (keyString: string, action: (key: Buffer, item?: Item) => Promise<T>): Promise<T> {
    const key = Buffer.from(keyString, 'utf8')
    return new Promise<T>((resolve, reject) => this.semaphore.take(() => (async () => {
      try {
        let item: Item | undefined
        try {
          item = deserialize(await this.levelup.get(key), this.itemDeserializer)
        } catch (err) {
          if (!(err instanceof levelup.errors.NotFoundError)) { throw err }
        }
        return action(key, item)
      } finally {
        this.semaphore.leave()
      }
    })().then(resolve, reject)))
  }
}
