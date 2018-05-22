import { AbstractLevelDOWN } from 'abstract-leveldown'
import { Node, NodeStore } from '../structure/merkle-patricia-trie'
import { Hash } from '../structure/cryptography'
import { serialize, deserialize } from '../structure/serializable'

export class LevelDownNodeStore implements NodeStore {
  constructor (
    private readonly db: AbstractLevelDOWN<Buffer, Buffer>
  ) { }

  public get (key: Hash): Promise<Node> {
    return new Promise((resolve, reject) => this.db.get(key.buffer, (err, value) => {
      /* istanbul ignore if: it's back-end error */
      if (err) { reject(err) } else { resolve(deserialize(value, Node.deserialize)) }
    }))
  }
  public set (key: Hash, value: Node): Promise<void> {
    return new Promise((resolve, reject) => this.db.put(key.buffer, serialize(value), (err) => {
      /* istanbul ignore if: it's back-end error */
      if (err) { reject(err) } else { resolve() }
    }))
  }
}

/* istanbul ignore next: it is for test and experiment  */
export class InMemoryNodeStore implements NodeStore {
  private store = new Map<string, Buffer>()
  public get (key: Hash): Promise<Node> {
    const value = this.store.get(key.buffer.toString('hex'))
    if (value) {
      return Promise.resolve(deserialize(value, Node.deserialize))
    } else {
      return Promise.reject(new Error('NotFound'))
    }
  }
  public set (key: Hash, value: Node): Promise<void> {
    this.store.set(key.buffer.toString('hex'), serialize(value))
    return Promise.resolve()
  }
}
