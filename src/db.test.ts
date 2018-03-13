import { Block, Database } from 'db'

describe('Database', () => {
  let block: Block = new Block()
  let database: Database = new Database()

  it('can lock & unlock database', done => {
    expect(database.isLocked()).toBeFalsy()
    database.touch(() => {
      expect(database.isLocked()).toBeTruthy()
      database.leave()
      done()
    })
  })

  it('can not use without lock', () => {
    return expect(database.putBlock(block))
      .rejects.toBeInstanceOf(Error)
  })

  it('can put a block', done => {
    database.touch(() => {
      database.putBlock(block)
        .then(data => {
          expect(data).toBeUndefined()
          database.leave()
          done()
        })
        .catch((err) => {
          throw err
        })
    })
  })

  test('can get block after put a block', done => {
    database.touch(() => {
      database.getBlock('test-hash')
        .then(data => {
          expect(data).toBeDefined()
          database.leave()
          done()
        })
        .catch((err) => {
          throw err
        })
    })
  })
})
