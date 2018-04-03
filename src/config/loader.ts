
import Ajv from 'ajv'
import fs from 'fs-extra'

export class Config<T> {
  private validate: any
  constructor (
    schema: object
  ) {
    let ajv = new Ajv()
    this.validate = ajv.compile(schema)
  }

  protected async load (configPath: string): Promise<T> {
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'))
    if (!this.validate(config)) { throw new Error(this.validate.errors[0].message) }
    return config as T
  }
}
