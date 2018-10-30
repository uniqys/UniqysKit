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

import Ajv from 'ajv'

export class Config<T> {
  private _validate: any
  constructor (
    schema: object
  ) {
    let ajv = new Ajv()
    this._validate = ajv.compile(schema)
  }

  public validate (config: {}): T {
    if (!this._validate(config)) { throw new Error(this._validate.errors[0].message) }
    return config as T
  }
}
