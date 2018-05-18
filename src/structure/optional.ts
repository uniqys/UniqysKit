import { Serializer, Deserializer, BufferWriter, UInt8 } from './serializable'

export abstract class Optional<T> {
  public abstract match<R> (some: (v: T) => R, none: () => R): R
  public isSome (): this is Some<T> { return this.match(_ => true, () => false) }
  public isNone (): this is None<T> { return this.match(_ => false, () => true) }
  public serialize (serializer: Serializer<T>) {
    return (writer: BufferWriter) => Optional.serialize(serializer)(this, writer)
  }
}
class Some<T> extends Optional<T> {
  constructor (
    public readonly value: T
  ) { super() }
  public match<R> (some: (v: T) => R, _: () => R): R { return some(this.value) }
}
class None<T> extends Optional<T> {
  constructor () { super() }
  public match<R> (_: (v: T) => R, none: () => R): R { return none() }
}
export namespace Optional {
  export function none<T> (): Optional<T> { return new None<T>() }
  export function some<T> (v: T): Optional<T> { return new Some(v) }
  export function serialize<T> (serializer: Serializer<T>): Serializer<Optional<T>> {
    return (opt, writer) => {
      opt.match(
        v => {
          UInt8.serialize(1, writer)
          serializer(v, writer)
        },
        () => {
          UInt8.serialize(0, writer)
        }
      )
    }
  }
  export function deserialize<T> (deserializer: Deserializer<T>): Deserializer<Optional<T>> {
    return (reader) => {
      const label = UInt8.deserialize(reader)
      switch (label) {
        case 0: return new None()
        case 1: return new Some(deserializer(reader))
        default: throw new Error()
      }
    }
  }
}
