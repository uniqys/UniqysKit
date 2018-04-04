import { Deserializer, Serializer, Deserialized } from './serializable'
import { UInt8 } from './bytes'

export abstract class Optional<T> {
  public abstract serialize (serializer: Serializer<T>): Buffer
  public abstract match<R> (some: (v: T) => R, none: () => R): R
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
  export function deserialize<T> (deserializer: Deserializer<T>): (buffer: Buffer) => Deserialized<Optional<T>> {
    return (buffer) => {
      if (buffer.readUInt8(0) === 1) {
        const result = deserializer(buffer.slice(1))
        return { rest: result.rest, value: new Some(result.value) }
      } else {
        return { rest: buffer.slice(1), value: new None() }
      }
    }
  }
}
