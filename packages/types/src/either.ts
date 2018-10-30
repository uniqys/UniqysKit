/*
  Copyright 2018 Bit Factory, Inc.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import { Serializer, Deserializer, BufferWriter, UInt8 } from '@uniqys/serialize'

export abstract class Either<L,R> {
  public abstract match<T> (left: (v: L) => T, right: (v: R) => T): T
  public isLeft (): this is Either.Left<L, R> { return this.match(_ => true, _ => false) }
  public isRight (): this is Either.Right<L, R> { return this.match(_ => false, _ => true) }
  public serialize (left: Serializer<L>, right: Serializer<R>): (writer: BufferWriter) => void {
    return (writer: BufferWriter) => Either.serialize(left, right)(this, writer)
  }
}

export namespace Either {
  export class Left<L, R> extends Either<L, R> {
    constructor (
      public readonly value: L
    ) { super() }
    public match<T> (left: (v: L) => T, _: (v: R) => T): T { return left(this.value) }
  }
  export class Right<L, R> extends Either<L, R> {
    constructor (
      public readonly value: R
    ) { super() }
    public match<T> (_: (v: L) => T, right: (v: R) => T): T { return right(this.value) }
  }

  export function left<L, R> (v: L): Either<L, R> { return new Left(v) }
  export function right<L, R> (v: R): Either<L, R> { return new Right(v) }
  export function serialize<L, R> (left: Serializer<L>, right: Serializer<R>): Serializer<Either<L, R>> {
    return (e, writer) => {
      e.match(
        v => {
          UInt8.serialize(0, writer)
          left(v, writer)
        },
        v => {
          UInt8.serialize(1, writer)
          right(v, writer)
        }
      )
    }
  }
  export function deserialize<L, R> (left: Deserializer<L>, right: Deserializer<R>): Deserializer<Either<L, R>> {
    return (reader) => {
      const label = UInt8.deserialize(reader)
      switch (label) {
        case 0: return new Left(left(reader))
        case 1: return new Right(right(reader))
        default: throw new Error()
      }
    }
  }
}
