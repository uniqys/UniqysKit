import { Config } from '.'
import fs from 'fs-extra'
import tmp from 'tmp'

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
  public async load (configFile: string): Promise<Test> {
    return super.load(configFile)
  }
}
const valid = {
  'name': 'Alice',
  'age': 10
}
const invalid1 = {
  'name': 'Charlie'
}
const invalid2 = {
  'name': 'Bob',
  'age': -10
}

describe('Config loader', () => {
  let validPath: string
  let invalidPath1: string
  let invalidPath2: string
  beforeAll((done) => {
    tmp.file((err, path, _, __) => {
      if (err) { throw err }
      validPath = path
      fs.writeFile(path, JSON.stringify(valid)).then(() => { done() }, (e) => { throw e })
    })
    tmp.file((err, path, _, __) => {
      if (err) { throw err }
      invalidPath1 = path
      fs.writeFile(path, JSON.stringify(invalid1)).then(() => { done() }, (e) => { throw e })
    })
    tmp.file((err, path, _, __) => {
      if (err) { throw err }
      invalidPath2 = path
      fs.writeFile(path, JSON.stringify(invalid2)).then(() => { done() }, (e) => { throw e })
    })
  })
  it('can load valid config', async () => {
    const loader = new TestConfig()
    const loaded = await loader.load(validPath)
    expect(loaded.name).toBe('Alice')
    expect(loaded.age).toBe(10)
  })
  it('throw error if will load missing parameter config', async () => {
    const loader = new TestConfig()
    await expect(loader.load(invalidPath1)).rejects.toThrow()
  })
  it('throw error if will load invalid parameter config', async () => {
    const loader = new TestConfig()
    await expect(loader.load(invalidPath2)).rejects.toThrow()
  })
})
