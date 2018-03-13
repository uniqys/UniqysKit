
export class Byte {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 1) { throw TypeError() }
  }

  public equals (other: Byte): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes4 {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 4) { throw TypeError() }
  }

  public equals (other: Bytes4): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes8 {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 8) { throw TypeError() }
  }

  public equals (other: Bytes8): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes32 {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 32) { throw TypeError() }
  }
  public equals (other: Bytes32): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class Bytes64 {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 64) { throw TypeError() }
  }

  public equals (other: Bytes64): boolean {
    return this.buffer.equals(other.buffer)
  }
}

export class UInt8 extends Byte {
  public static fromNumber (num: number): UInt8 {
    const buf = new Buffer(1)
    buf.writeUInt8(num, 0)
    return new UInt8(buf)
  }
}

export class UInt32 extends Bytes4 {
  public static fromNumber (num: number): UInt32 {
    const buf = new Buffer(4)
    buf.writeUInt32BE(num, 0)
    return new UInt32(buf)
  }
}

export class UInt64 extends Bytes8 {
  public static fromNumber (num: number): UInt64 {
    const buf = new Buffer(8)
    buf.writeUIntBE(num, 2, 6) // max safe integer byte
    return new UInt64(buf)
  }
}
