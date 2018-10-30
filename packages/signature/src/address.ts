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

import { BufferReader } from '@uniqys/serialize'
import { Bytes20, Bytes64 } from '@uniqys/types'
import { Hash } from './cryptography'

export class Address extends Bytes20 {
  public static zero = new Address(Buffer.alloc(20))
  public static deserialize (reader: BufferReader): Address {
    return new Address(Bytes20.deserialize(reader).buffer)
  }
  public static fromPublicKey (publicKey: Bytes64): Address {
    return new Address(Hash.fromData(publicKey.buffer).buffer.slice(12, 32))
  }

  // string representation
  // TODO: checksum? base58?
  public static fromString (addressString: string): Address {
    return new Address(Buffer.from(addressString, 'hex'))
  }
  public toString (): string {
    return this.buffer.toString('hex')
  }
}
