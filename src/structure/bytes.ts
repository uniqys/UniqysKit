import { Serializable, Deserialized } from './serializable'

export class Byte implements Serializable {
  public static readonly serializedLength: 1 = 1
  private readonly length = Byte.serializedLength // for distinguish object types
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== this.length) { throw TypeError() }
  }
  public static deserialize (buffer: Buffer): Deserialized<Byte> { return { rest: buffer.slice(1), value: new Byte(buffer.slice(0, 1)) } }
  public serialize (): Buffer { return this.buffer }
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
  public static deserialize (buffer: Buffer): Deserialized<Bytes4> { return { rest: buffer.slice(4), value: new Bytes4(buffer.slice(0, 4)) } }
  public serialize (): Buffer { return this.buffer }
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
  public static deserialize (buffer: Buffer): Deserialized<Bytes8> { return { rest: buffer.slice(8), value: new Bytes8(buffer.slice(0, 8)) } }
  public serialize (): Buffer { return this.buffer }
  public equals (other: Bytes8): boolean {
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
  public static deserialize (buffer: Buffer): Deserialized<Bytes32> { return { rest: buffer.slice(32), value: new Bytes32(buffer.slice(0, 32)) } }
  public serialize (): Buffer { return this.buffer }
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
  public static deserialize (buffer: Buffer): Deserialized<Bytes64> { return { rest: buffer.slice(64), value: new Bytes64(buffer.slice(0, 64)) } }
  public serialize (): Buffer { return this.buffer }
  public equals (other: Bytes64): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class UInt8 extends Byte {
  public static fromNumber (num: number): UInt8 {
    const buf = Buffer.alloc(1)
    buf.writeUInt8(num, 0)
    return new UInt8(buf)
  }
  public static deserialize (buffer: Buffer): Deserialized<UInt8> { return { rest: buffer.slice(1), value: new UInt8(buffer.slice(0, 1)) } }
  public get number (): number {
    return this.buffer.readUInt8(0)
  }
}

export class UInt32 extends Bytes4 {
  public static fromNumber (num: number): UInt32 {
    const buf = Buffer.alloc(4)
    buf.writeUInt32BE(num, 0)
    return new UInt32(buf)
  }
  public static deserialize (buffer: Buffer): Deserialized<UInt32> { return { rest: buffer.slice(4), value: new UInt32(buffer.slice(0, 4)) } }
  public get number (): number {
    return this.buffer.readUInt32BE(0)
  }
}

export class UInt64 extends Bytes8 {
  public static fromNumber (num: number): UInt64 {
    if (num > 2 ** 48 - 1) { throw new RangeError('The number is out of 48bit range') }
    const buf = Buffer.alloc(8)
    buf.writeUIntBE(num, 2, 6) // max safe integer byte
    return new UInt64(buf)
  }
  public static deserialize (buffer: Buffer): Deserialized<UInt64> { return { rest: buffer.slice(8), value: new UInt64(buffer.slice(0, 8)) } }
  public get number (): number {
    return this.buffer.readUIntBE(2, 6) // max safe integer byte
  }
}
