import { Block, Database } from 'db'

describe('Database Test', () => {
  let database: Database = new Database({})
  let block: Block = new Block()

  it('put block', () => {
    expect(database.putBlock(block))
      .resolves.toBeUndefined()
  })

  it('get block', () => {
    expect(database.getBlock('test-hash'))
      .resolves.toBeDefined()
  })
})
