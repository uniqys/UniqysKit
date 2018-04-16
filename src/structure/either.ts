import { Serializer, Deserializer } from './serializable'
import { UInt8 } from './bytes'

export abstract class Either<L,R> {
  public abstract serialize (left: Serializer<L>, right: Serializer<R>): Buffer
  public abstract match<T> (left: (v: L) => T, right: (v: R) => T): T
}
class Left<L, R> extends Either<L, R> {
  constructor (
    public readonly value: L
  ) { super() }
  public serialize (left: Serializer<L>, _: Serializer<R>): Buffer {
    return Buffer.concat([
      UInt8.fromNumber(0).serialize(),
      left(this.value)
    ])
  }
  public match<T> (left: (v: L) => T, _: (v: R) => T): T {
    return left(this.value)
  }
}
class Right<L, R> extends Either<L, R> {
  constructor (
    public readonly value: R
  ) { super() }
  public serialize (_: Serializer<L>, right: Serializer<R>): Buffer {
    return Buffer.concat([
      UInt8.fromNumber(1).serialize(),
      right(this.value)
    ])
  }
  public match<T> (_: (v: L) => T, right: (v: R) => T): T {
    return right(this.value)
  }
}
export namespace Either {
  export function left<L, R> (v: L): Either<L, R> { return new Left(v) }
  export function right<L, R> (v: R): Either<L, R> { return new Right(v) }
  export function deserialize<L, R> (left: Deserializer<L>, right: Deserializer<R>): Deserializer<Either<L, R>> {
    return (buffer) => {
      const label = buffer.readUInt8(0)
      buffer = buffer.slice(1)
      switch (label) {
        case 0: {
          const result = left(buffer)
          return { rest: result.rest, value: new Left(result.value) }
        }
        case 1: {
          const result = right(buffer)
          return { rest: result.rest, value: new Right(result.value) }
        }
        default: throw new Error()
      }
    }
  }
}
