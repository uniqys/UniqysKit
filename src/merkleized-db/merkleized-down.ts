import { AbstractLevelDOWN } from 'abstract-leveldown'
import { Hash } from '../structure/cryptography'
import { MerklePatriciaTrie } from '../structure/merkle-patricia-trie'
import { NodeStore, Node } from '../structure/merkle-patricia-trie-node/common'

class LevelDownNodeStore implements NodeStore {
  constructor (
    private readonly db: AbstractLevelDOWN<Buffer, Buffer>
  ) { }

  public get (key: Hash): Promise<Node> {
    return new Promise((resolve, reject) => this.db.get(key.serialize(), (err, value) => {
      /* istanbul ignore if: it's back-end error */
      if (err) { reject(err) } else { resolve(Node.deserialize(value).value) }
    }))
  }
  public set (value: Node): Promise<Hash> {
    const buf = value.serialize()
    const key = Hash.fromData(buf)
    return new Promise((resolve, reject) => this.db.put(key.serialize(), buf, (err) => {
      /* istanbul ignore if: it's back-end error */
      if (err) { reject(err) } else { resolve(key) }
    }))
  }
}

export class MerkleizedDown<O = any> extends AbstractLevelDOWN<Buffer, Buffer, O> {
  private readonly trie: MerklePatriciaTrie
  private readonly store: LevelDownNodeStore

  constructor (
    private readonly db: AbstractLevelDOWN<Buffer, Buffer>
  ) {
    super('')
    this.store = new LevelDownNodeStore(this.db)
    this.trie = new MerklePatriciaTrie(this.store)
  }

  // added methods
  public root (callback: (err: any, hash?: Hash) => void): void {
    callback(null, this.trie.root)
  }
  public clear (callback: (err: any) => void): void {
    this.trie.clear()
      .then(
        () => callback(null),
        /* istanbul ignore next: it's back-end error */
        err => callback(err)
      )
  }

  protected _open (options: O, callback: (err: any) => void): void {
    this.db.open(options, err => {
      /* istanbul ignore else: it's back-end error */
      if (!err) {
        this.trie.init()
          .then(
            () => callback(null),
            /* istanbul ignore next: it's back-end error */
            err => callback(err)
          )
      } else {
        callback(err)
      }
    })
  }
  protected _close (callback: (err: any) => void): void {
    this.db.close(callback)
  }
  protected _get (key: Buffer, _options: any, callback: (err: any, value?: Buffer) => void): void {
    this.trie.get(key).then(
      opt => opt.match(
        val => callback(null, val),
        () => callback(new Error('NotFound'))),
      /* istanbul ignore next: it's back-end error */
      err => callback(err)
    )
  }
  protected _put (key: Buffer, value: Buffer, _options: any, callback: (err: any) => void): void {
    this.trie.set(key, value).then(
      () => callback(null),
      /* istanbul ignore next: it's back-end error */
      err => callback(err)
    )
  }
  protected _del (key: Buffer, _options: any, callback: (err: any) => void): void {
    this.trie.delete(key).then(
      () => callback(null),
      /* istanbul ignore next: it's back-end error */
      err => callback(err)
    )
  }
  // TODO: implements _iterator
}
