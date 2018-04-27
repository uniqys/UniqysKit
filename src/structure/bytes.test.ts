import { Byte, Bytes4, Bytes8, Bytes32, Bytes64, UInt8, UInt32, UInt64, Int64 } from './bytes'

/* tslint:disable:no-unused-expression */
describe('Byte', () => {
  it('can create from 1 byte buffer', () => {
    expect(() => { new Byte(Buffer.alloc(1)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Byte(Buffer.alloc(2)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Byte(Buffer.from('a')).equals(new Byte(Buffer.from('a')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Byte(Buffer.from('a'))
    expect(Byte.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('Bytes4', () => {
  it('can create from 4 byte buffer', () => {
    expect(() => { new Bytes4(Buffer.alloc(4)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes4(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes4(Buffer.from('buzz')).equals(new Bytes4(Buffer.from('buzz')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes4(Buffer.from('buzz'))
    expect(Bytes4.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('Bytes8', () => {
  it('can create from 8 byte buffer', () => {
    expect(() => { new Bytes8(Buffer.alloc(8)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes8(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes8(Buffer.from('fizzBuzz')).equals(new Bytes8(Buffer.from('fizzBuzz')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes8(Buffer.from('fizzBuzz'))
    expect(Bytes8.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('Bytes32', () => {
  it('can create from 32 byte buffer', () => {
    expect(() => { new Bytes32(Buffer.alloc(32)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes32(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes32(Buffer.from('This sentence has no meaning yet'))
      .equals(new Bytes32(Buffer.from('This sentence has no meaning yet')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes32(Buffer.from('This sentence has no meaning yet'))
    expect(Bytes32.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('Bytes64', () => {
  it('can create from 32 byte buffer', () => {
    expect(() => { new Bytes64(Buffer.alloc(64)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes64(Buffer.alloc(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes64(Buffer.from('This sentence had no meaning, this sentence still has no meaning'))
      .equals(new Bytes64(Buffer.from('This sentence had no meaning, this sentence still has no meaning')))).toBeTruthy()
  })
  it('is serializable', () => {
    const object = new Bytes64(Buffer.from('This sentence had no meaning, this sentence still has no meaning'))
    expect(Bytes64.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('UInt8', () => {
  it('can create from number of 8bit unsigned integer', () => {
    expect(() => { UInt8.fromNumber(255) }).not.toThrow()
  })
  it('throw error when over 8bit unsigned integer', () => {
    expect(() => { UInt8.fromNumber(256) }).toThrow()
  })
  it('can get number', () => {
    expect(UInt8.fromNumber(255).number).toBe(255)
  })
  it('is serializable', () => {
    const object = UInt8.fromNumber(42)
    expect(UInt8.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('UInt32', () => {
  it('can create from number of 32bit unsigned integer', () => {
    expect(() => { UInt32.fromNumber(4294967295) }).not.toThrow()
  })
  it('throw error when over 32bit unsigned integer', () => {
    expect(() => { UInt32.fromNumber(4294967296) }).toThrow()
  })
  it('can get number', () => {
    expect(UInt32.fromNumber(4294967295).number).toBe(4294967295)
  })
  it('is serializable', () => {
    const object = UInt32.fromNumber(42)
    expect(UInt32.deserialize(UInt32.fromNumber(42).serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('UInt64', () => {
  it('can create from number of 48bit unsigned integer for safe', () => {
    expect(() => { UInt64.fromNumber(281474976710655) }).not.toThrow()
  })
  it('throw error when over 48bit unsigned integer', () => {
    expect(() => { UInt64.fromNumber(281474976710656) }).toThrow()
  })
  it('can get number', () => {
    expect(UInt64.fromNumber(281474976710655).number).toBe(281474976710655)
  })
  it('is serializable', () => {
    const object = UInt64.fromNumber(42)
    expect(UInt64.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})

describe('Int64', () => {
  it('can create from number of 48bit signed integer for safe', () => {
    expect(() => { Int64.fromNumber(140737488355327) }).not.toThrow()
    expect(() => { Int64.fromNumber(-140737488355328) }).not.toThrow()
  })
  it('throw error when over 48bit signed integer', () => {
    expect(() => { Int64.fromNumber(140737488355328) }).toThrow()
    expect(() => { Int64.fromNumber(-140737488355329) }).toThrow()
  })
  it('can get number', () => {
    expect(Int64.fromNumber(140737488355327).number).toBe(140737488355327)
    expect(Int64.fromNumber(-140737488355328).number).toBe(-140737488355328)
  })
  it('is serializable', () => {
    const object = Int64.fromNumber(-140737488355328)
    expect(Int64.deserialize(object.serialize()).value.equals(object)).toBeTruthy()
  })
})
