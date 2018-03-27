import * as methods from './methods'
import { Block } from '../chain-core/blockchain'

describe('RPC raw methods', () => {

  it('can test add', done => {
    methods.add([1, 2], (err: Error, res: any) => {
      expect(err).toBeNull()
      expect(res).toBe(3)
      done()
    })
  })

  it('can get block', done => {
    methods.getblock([1], (err: Error, res: Block) => {
      expect(err).toBeNull()
      expect(res).toBeDefined()
      done()
    })
  })

  it('can get block hash', done => {
    methods.getblockhash([1], (err: Error, res: any) => {
      expect(err).toBeNull()
      expect(res).toBeDefined()
      done()
    })
  })

  it('can get block height', done => {
    methods.getblockcount((err: Error, res: number) => {
      expect(err).toBeNull()
      expect(res).toBeDefined()
      done()
    })
  })
})
