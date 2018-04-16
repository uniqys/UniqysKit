import { UInt8 } from './bytes'
import { Either } from './either'

describe('Either', () => {
  it('can be either value', () => {
    expect(Either.left<number, string>(42)).toBeInstanceOf(Either)
    expect(Either.right<number, string>('foo')).toBeInstanceOf(Either)
  })
  it('can be destructed by match method', () => {
    expect(Either.left(42).match(n => n, _ => 0)).toBe(42)
    expect(Either.right('foo').match(_ => '', s => s)).toBe('foo')
  })
  it('is serializable', () => {
    const deserializer = Either.deserialize(UInt8.deserialize, buff => { return { rest: new Buffer(0), value: buff.toString() } })
    const left = Either.left<UInt8, string>(UInt8.fromNumber(42)).serialize(n => n.serialize(), s => Buffer.from(s))
    expect(deserializer(left).value.match(v => v, _ => UInt8.fromNumber(0)).number).toBe(42)
    const right = Either.right<UInt8, string>('foo').serialize(n => n.serialize(), s => Buffer.from(s))
    expect(deserializer(right).value.match(_ => '', s => s)).toBe('foo')
  })
  it('throw error when deserialize invalid buffer', () => {
    const deserializer = Either.deserialize(UInt8.deserialize, buff => { return { rest: new Buffer(0), value: buff.toString() } })
    const left = Either.left<UInt8, string>(UInt8.fromNumber(42)).serialize(n => n.serialize(), s => Buffer.from(s))
    left.writeUInt8(2, 0) // overwrite label byte
    expect(() => { deserializer(left) }).toThrow()
  })
})
