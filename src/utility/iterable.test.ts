import { Readable } from 'stream'
import { StreamIterable, toAsync } from './iterable'

describe('StreamIterable', () => {
  it('is AsyncIterable made from stream', async () => {
    const items = ['one', 'two', 'three', 'four', 'five']
    const readable = new Readable({
      objectMode: true,
      read: function () {
        this.push(items.shift())
        if (items.length === 0) { this.push(null) }
      }
    })
    const iterable = new StreamIterable<string>(readable)

    const read = []
    // maybe tslint type checking miss
    // tslint:disable-next-line:await-promise */
    for await (const item of iterable) {
      read.push(item)
    }
    expect(read).toEqual(['one', 'two', 'three', 'four', 'five'])
    const ended = await iterable.next()
    expect(ended.done).toBe(true)
  })
  it('is pass error from stream', async () => {
    const items = ['one', 'two', 'three', 'four', 'five']
    const readable = new Readable({
      objectMode: true,
      read: function () {
        const v = items.shift()
        if (v === 'three') {
          this.emit('error', new Error('wow'))
          this.push(null)
        }
        this.push(v)
        if (items.length === 0) { this.push(null) }
      }
    })

    const iterable = new StreamIterable<string>(readable)

    const read: string[] = []
    await expect((async () => {
      // maybe tslint type checking miss
      // tslint:disable-next-line:await-promise
      for await (const item of iterable) {
        read.push(item)
      }
    })()).rejects.toThrow()
    expect(read).toEqual(['one', 'two'])
    await expect(iterable.next()).rejects.toThrow()
  })
  describe('cover corner case', () => {
    let readable: Readable
    beforeEach(() => {
      readable = new Readable({
        objectMode: true,
        /* tslint:disable-next-line:no-empty */
        read: function () { }
      })
    })
    test('read after push', async () => {
      const iterable = new StreamIterable<string>(readable)

      let promise
      let value
      readable.push('a')
      promise = iterable.next()
      value = (await promise).value
      expect(value).toBe('a')
    })
    test('read before push', async () => {
      const iterable = new StreamIterable<string>(readable)

      let promise
      let value
      promise = iterable.next()
      readable.push('a')
      value = (await promise).value
      expect(value).toBe('a')
    })
    test('read after raise error', async () => {
      const iterable = new StreamIterable<string>(readable)

      let promise
      readable.emit('error', new Error())
      promise = iterable.next()
      await expect(promise).rejects.toThrow()
    })
    test('read before raise error', async () => {
      const iterable = new StreamIterable<string>(readable)

      let promise
      promise = iterable.next()
      readable.emit('error', new Error())
      await expect(promise).rejects.toThrow()
    })
    test('read after end', async () => {
      const iterable = new StreamIterable<string>(readable)

      let promise
      let done
      readable.push(null)
      promise = iterable.next()
      done = (await promise).done
      expect(done).toBe(true)
    })
    test('read before end', async () => {
      const iterable = new StreamIterable<string>(readable)

      let promise
      let done
      promise = iterable.next()
      readable.push(null)
      done = (await promise).done
      expect(done).toBe(true)
    })
  })
})

describe('toAsync', () => {
  it('make a Iterable a AsyncIterable', async () => {
    const iterable = ['one', 'two', 'three', 'four', 'five']
    const asyncIterable = toAsync(iterable)
    const read = []
    for await (const item of asyncIterable) {
      read.push(item)
    }
    expect(read).toEqual(['one', 'two', 'three', 'four', 'five'])
  })
})
