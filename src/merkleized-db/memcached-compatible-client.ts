// This is just a little extension of the existing library.
// It is probably possible to do the same in other languages.
import Memcached from 'memcached'

export class MerkleizedMemcached extends Memcached {
  public root (
    callback: (this: Memcached.CommandData, err: any, data: Buffer) => void
  ): void {
    (this as any).command(() => ({
      key: '', // not used
      callback: function (this: Memcached.CommandData, err: any, data: string) {
        if (err) { return callback.call(this, err) }
        callback.call(this, null, Buffer.from(data, 'hex'))
      },
      validate: [['callback', Function]],
      type: 'root', // not used
      command: 'root hex'
    }))
  }
}
