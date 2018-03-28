import { isNull } from 'util'

export class StreamIterable<T> implements AsyncIterableIterator<T> {
  private resolve?: (result: IteratorResult<T>) => void
  private reject?: (err: any) => void
  private error: any
  private ended: boolean = false
  constructor (
    private readonly stream: NodeJS.ReadableStream
  ) {
    this.stream.on('readable', () => {
      if (this.resolve) {
        const resolve = this.resolve
        const v = this.stream.read() as any as T
        if (!isNull(v)) {
          this.resolve = undefined
          this.reject = undefined
          resolve({ done: false, value: v })
        }
      }
    })
    this.stream.once('end', () => {
      if (this.resolve) {
        const resolve = this.resolve
        this.resolve = undefined
        this.reject = undefined
        resolve({ done: true } as IteratorResult<T>)
      }
      this.ended = true
    })
    this.stream.once('error', error => {
      if (this.reject) {
        const reject = this.reject
        this.resolve = undefined
        this.reject = undefined
        reject(error)
      }
      this.error = error
    })
  }

  [Symbol.asyncIterator] (): AsyncIterableIterator<T > {
    return this
  }

  next (): Promise<IteratorResult < T >> {
    const v = this.stream.read() as any as T
    if (v) { return Promise.resolve({ done: false, value: v }) }
    if (this.ended) { return Promise.resolve({ done: true } as IteratorResult<T>) }
    if (this.error) { return Promise.reject(this.error) }

    return new Promise((resolve, reject) => {
      this.resolve = resolve
      this.reject = reject
    })
  }
}

export async function* toAsync<T> (iterable: Iterable<T>): AsyncIterableIterator<T> {
  for (const v of iterable) {
    yield v
  }
}
