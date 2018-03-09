
export class Byte {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 1) { throw TypeError() }
  }
}

export class Bytes4 {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 4) { throw TypeError() }
  }
}

export class Bytes8 {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 8) { throw TypeError() }
  }
}

export class Bytes32 {
  constructor (
    public readonly buffer: Buffer
  ) {
    if (buffer.length !== 32) { throw TypeError() }
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
