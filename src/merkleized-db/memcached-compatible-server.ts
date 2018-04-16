import net from 'net'
import { AbstractLevelDOWN } from 'abstract-leveldown'
import { MemcachedTextProtocol, Response, Checker } from './memcached-compatible-server/handler'
import { LevelDownMemcachedSubset, Options } from './memcached-compatible-server/leveldown-implementation'
import { MerkleizedDown } from './merkleized-down'

export { Options }
export class MerkleizedMemcachedSubset extends LevelDownMemcachedSubset {
  constructor (
    private readonly merkleizedDb: MerkleizedDown,
    /* istanbul ignore next: default parameter */
    options: Options = {}
  ) {
    super(merkleizedDb, options)
  }
  public root (hex: boolean): Promise<Response.Value> {
    return new Promise((resolve, reject) => this.merkleizedDb.root((err, hash) => {
      /* istanbul ignore next: it's back-end error */
      if (err || !hash) { return reject(err) }
      return resolve({ key: '', flags: 0, data: hex ? Buffer.from(hash.serialize().toString('hex')) : hash.serialize() })
    }))
  }
  // shortcut implementation
  public flush (): Promise<Response.Ok> {
    return new Promise<Response.Ok>((resolve, reject) => this.merkleizedDb.clear((err) => {
      /* istanbul ignore next: it's back-end error */
      if (err) { return reject(err) }
      return resolve(Response.Ok)
    }))
  }
}

export class MerkleizedMemcachedTextProtocol extends MemcachedTextProtocol {
  constructor (
    socket: net.Socket,
    private readonly merkleized: MerkleizedMemcachedSubset
  ) {
    super(socket, merkleized)
  }
  protected async processCommand (command: string, params: string[]): Promise<void> {
    switch (command) {
      case 'root': {
        const [hex] = Checker.get((raw) => {
          if (raw === undefined) { return false }
          if (raw === 'hex') { return true }
          throw new Checker.CheckError('bad format')
        })(params)
        this.writeValue(await this.merkleized.root(hex))
        this.writeEnd()
        break
      }
      // TODO: case 'proof'
      default: {
        return super.processCommand(command, params)
      }
    }
  }
}

export class MerkleizedDbServer extends net.Server {
  constructor (
    db: AbstractLevelDOWN,
    /* istanbul ignore next: default parameter */
    options: Options = {}
  ) {
    const impl = new MerkleizedMemcachedSubset(new MerkleizedDown(db), options)
    super(socket => new MerkleizedMemcachedTextProtocol(socket, impl).handle())
  }
}
