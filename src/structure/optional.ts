import { Serializer, Deserializer } from './serializable'
import { UInt8 } from './bytes'

export abstract class Optional<T> {
  public abstract serialize (serializer: Serializer<T>): Buffer
  public abstract match<R> (some: (v: T) => R, none: () => R): R
  public get hasValue (): boolean { return this.match(_ => true, () => false) }
}
class Some<T> extends Optional<T> {
  constructor (
    public readonly value: T
  ) { super() }
  public serialize (serializer: Serializer<T>): Buffer {
    return Buffer.concat([
      UInt8.fromNumber(1).serialize(),
      serializer(this.value)
    ])
  }
  public match<R> (some: (v: T) => R, _: () => R): R {
    return some(this.value)
  }
}
class None<T> extends Optional<T> {
  constructor () { super() }
  public serialize (_: Serializer<T>): Buffer {
    return UInt8.fromNumber(0).serialize()
  }
  public match<R> (_: (v: T) => R, none: () => R): R {
    return none()
  }
}
export namespace Optional {
  export function none<T> () { return new None<T>() }
  export function some<T> (v: T) { return new Some(v) }
  export function deserialize<T> (deserializer: Deserializer<T>): Deserializer<Optional<T>> {
    return (buffer) => {
      const label = buffer.readUInt8(0)
      buffer = buffer.slice(1)
      switch (label) {
        case 0: {
          return { rest: buffer, value: new None() }
        }
        case 1: {
          const result = deserializer(buffer)
          return { rest: result.rest, value: new Some(result.value) }
        }
        default: throw new Error()
      }
    }
  }
}
