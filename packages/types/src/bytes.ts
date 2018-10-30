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

import { Serializable, Deserializer, BufferWriter } from '@uniqys/serialize'

export class Byte implements Serializable {
  public static readonly serializedLength: 1 = 1
  private readonly length = Byte.serializedLength // for distinguish object types
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== this.length) { throw TypeError() }
  }
  public static deserialize: Deserializer<Byte> = reader => new Byte(reader.consume(1))
  public serialize (writer: BufferWriter) { writer.append(this.buffer) }
  public equals (other: Byte): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes4 implements Serializable {
  public static readonly serializedLength: 4 = 4
  private readonly length = Bytes4.serializedLength // for distinguish object types
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== this.length) { throw TypeError() }
  }
  public static deserialize: Deserializer<Bytes4> = reader => new Bytes4(reader.consume(4))
  public serialize (writer: BufferWriter) { writer.append(this.buffer) }
  public equals (other: Bytes4): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes8 implements Serializable {
  public static readonly serializedLength: 8 = 8
  private readonly length = Bytes8.serializedLength // for distinguish object types
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== this.length) { throw TypeError() }
  }
  public static deserialize: Deserializer<Bytes8> = reader => new Bytes8(reader.consume(8))
  public serialize (writer: BufferWriter) { writer.append(this.buffer) }
  public equals (other: Bytes8): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes20 implements Serializable {
  public static readonly serializedLength: 20 = 20
  private readonly length = Bytes20.serializedLength // for distinguish object types
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== this.length) { throw TypeError() }
  }
  public static deserialize: Deserializer<Bytes20> = reader => new Bytes20(reader.consume(20))
  public serialize (writer: BufferWriter) { writer.append(this.buffer) }
  public equals (other: Bytes20): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes32 implements Serializable {
  public static readonly serializedLength: 32 = 32
  private readonly length = Bytes32.serializedLength // for distinguish object types
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== this.length) { throw TypeError() }
  }
  public static deserialize: Deserializer<Bytes32> = reader => new Bytes32(reader.consume(32))
  public serialize (writer: BufferWriter) { writer.append(this.buffer) }
  public equals (other: Bytes32): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes64 implements Serializable {
  public static readonly serializedLength: 64 = 64
  private readonly length = Bytes64.serializedLength // for distinguish object types
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== this.length) { throw TypeError() }
  }
  public static deserialize: Deserializer<Bytes64> = reader => new Bytes64(reader.consume(64))
  public serialize (writer: BufferWriter) { writer.append(this.buffer) }
  public equals (other: Bytes64): boolean {
    return this.buffer.equals(other.buffer)
  }
}
