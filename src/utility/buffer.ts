
// Buffer implements Uint8Array as you probably know.
// Just because protobuf mistakes the type, this is.
// ref. https://github.com/google/protobuf/issues/1319
export function bufferToUint8Array (buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
}

export function uint8ArrayToBuffer (uint8Array: Uint8Array): Buffer {
  return Buffer.from(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength)
}
