import { Byte, Bytes4, Bytes8, Bytes32, Bytes64, UInt8, UInt32, UInt64 } from './bytes'

/* tslint:disable:no-unused-expression */
describe('Byte', () => {
  it('can create from 1 byte buffer', () => {
    expect(() => { new Byte(new Buffer(1)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Byte(new Buffer(2)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Byte(new Buffer('a')).equals(new Byte(new Buffer('a')))).toBeTruthy()
  })
})

describe('Bytes4', () => {
  it('can create from 4 byte buffer', () => {
    expect(() => { new Bytes4(new Buffer(4)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes4(new Buffer(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes4(new Buffer('buzz')).equals(new Bytes4(new Buffer('buzz')))).toBeTruthy()
  })
})

describe('Bytes8', () => {
  it('can create from 8 byte buffer', () => {
    expect(() => { new Bytes8(new Buffer(8)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes8(new Buffer(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes8(new Buffer('fizzBuzz')).equals(new Bytes8(new Buffer('fizzBuzz')))).toBeTruthy()
  })
})

describe('Bytes32', () => {
  it('can create from 32 byte buffer', () => {
    expect(() => { new Bytes32(new Buffer(32)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes32(new Buffer(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes32(new Buffer('This sentence has no meaning yet'))
      .equals(new Bytes32(new Buffer('This sentence has no meaning yet')))).toBeTruthy()
  })
})

describe('Bytes64', () => {
  it('can create from 32 byte buffer', () => {
    expect(() => { new Bytes64(new Buffer(64)) }).not.toThrow()
  })
  it('throw error when wrong size', () => {
    expect(() => { new Bytes64(new Buffer(1)) }).toThrow()
  })
  it('is equatable', () => {
    expect(new Bytes64(new Buffer('This sentence had no meaning, this sentence still has no meaning'))
      .equals(new Bytes64(new Buffer('This sentence had no meaning, this sentence still has no meaning')))).toBeTruthy()
  })
})

describe('UInt8', () => {
  it('can create from number of 8bit unsigned integer', () => {
    expect(() => { UInt8.fromNumber(255) }).not.toThrow()
  })
  it('throw error when over 8bit unsigned integer', () => {
    expect(() => { UInt8.fromNumber(256) }).toThrow()
  })
})

describe('UInt32', () => {
  it('can create from number of 32bit unsigned integer', () => {
    expect(() => { UInt32.fromNumber(4294967295) }).not.toThrow()
  })
  it('throw error when over 32bit unsigned integer', () => {
    expect(() => { UInt32.fromNumber(4294967296) }).toThrow()
  })
})

describe('UInt64', () => {
  it('can create from number of 48bit unsigned integer for safe', () => {
    expect(() => { UInt64.fromNumber(281474976710655) }).not.toThrow()
  })
  it('throw error when over 48bit unsigned integer', () => {
    expect(() => { UInt64.fromNumber(281474976710656) }).toThrow()
  })
})
