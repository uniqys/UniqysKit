export type Serializer<T> = (v: T) => Buffer
export type Deserialized<T> = { rest: Buffer, value: T }
export type Deserializer<T> = (buffer: Buffer) => Deserialized<T>
export interface Serializable {
  serialize (): Buffer
}
