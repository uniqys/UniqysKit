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

import { Config } from '.'

const schema = {
  'type': 'object',
  'required': ['name', 'age'],
  'properties': {
    'name': {
      'type': 'string'
    },
    'age': {
      'type': 'integer',
      'minimum': 0
    }
  }
}
interface Test {
  name: string
  age: number
}
class TestConfig extends Config<Test> {
  constructor () { super(schema) }
}

describe('Config loader', () => {
  it('validate config', () => {
    const config = new TestConfig().validate({
      'name': 'Alice',
      'age': 10
    })
    expect(config.name).toBe('Alice')
    expect(config.age).toBe(10)
  })
  it('throw error if will load missing parameter config', () => {
    expect(() => {
      new TestConfig().validate({
        'name': 'Charlie'
      })
    }).toThrow()
  })
  it('throw error if will load invalid parameter config', () => {
    expect(() => {
      new TestConfig().validate({
        'name': 'Bob',
        'age': -10
      })
    }).toThrow()
  })
})
