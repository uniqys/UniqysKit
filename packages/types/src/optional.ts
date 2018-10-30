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

export abstract class Optional<T> {
  public abstract match<R> (some: (v: T) => R, none: () => R): R
  public isSome (): this is Optional.Some<T> { return this.match(_ => true, () => false) }
  public isNone (): this is Optional.None<T> { return this.match(_ => false, () => true) }
  public serialize (serializer: Serializer<T>): (writer: BufferWriter) => void {
    return (writer: BufferWriter) => Optional.serialize(serializer)(this, writer)
  }
}

export namespace Optional {
  export class Some<T> extends Optional<T> {
    constructor (
      public readonly value: T
    ) { super() }
    public match<R> (some: (v: T) => R, _: () => R): R { return some(this.value) }
  }
  export class None<T> extends Optional<T> {
    constructor () { super() }
    public match<R> (_: (v: T) => R, none: () => R): R { return none() }
  }
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
