import { bufferToUint8Array, uint8ArrayToBuffer } from './buffer'

describe('Buffer <-> Uint8Array', () => {
  it('is isomorphic', () => {
    const buffer = new Buffer('meow')
    expect(uint8ArrayToBuffer(bufferToUint8Array(buffer)).equals(buffer)).toBeTruthy()
  })
  it('treats length', () => {
    const arrayBuffer = new Buffer('long-long-buffer').buffer
    const buffer = Buffer.from(arrayBuffer, 0, 10)

    expect(uint8ArrayToBuffer(bufferToUint8Array(buffer)).equals(buffer)).toBeTruthy()
  })
})
