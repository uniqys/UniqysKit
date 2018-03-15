import { Database, ChainHead } from './db'
import { Block, BlockData, Consensus, BlockHeader, ValidatorSet } from './blockchain'
import { MerkleTree } from '../structure'
import { Hash } from '../cryptography'

describe('Database', () => {
  let database: Database
  let block: Block

  beforeAll(() => {
    // TODO validator testからコピったので気になったら綺麗にする
    const data = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), new ValidatorSet([]))
    const lastBlockHash = Hash.fromData('genesis!')
    const state = Hash.fromData('genesis state')
    const validator = Hash.fromData('validator set')
    const epoch = 1520825696
    const header = new BlockHeader(1, epoch, lastBlockHash, data.transactions.root, data.lastBlockConsensus.hash, state, validator)
    block = new Block(data, header)
    database = new Database()
  })

  it('can lock & unlock database', done => {
    expect(database.isLocked()).toBeFalsy()
    database.touch(() => {
      expect(database.isLocked()).toBeTruthy()
      database.leave()
      done()
    })
  })

  it('can not addBlock without lock', () => {
    return expect(database.addBlock(block))
      .rejects.toBeInstanceOf(Error)
  })

  it('can add a block', done => {
    database.touch(() => {
      database.addBlock(block)
        .then((data: any) => {
          expect(data).toBeUndefined()
          database.leave()
          done()
        })
        .catch((err: Error) => {
          throw err
        })
    })
  })

  it('can get block after put a block', done => {
    database.getBlock(block.hash)
      .then((block: Block) => {
        expect(block).toBeInstanceOf(Block)
        done()
      })
      .catch((err: Error) => {
        throw err
      })
  })

  it('can get head meta', done => {
    database.getHead()
      .then((head: ChainHead) => {
        expect(head.lastBlockHash.buffer).toEqual(block.hash.buffer.toJSON())
        done()
      })
      .catch((err: Error) => {
        throw err
      })
  })

  it('can get lastBlock', done => {
    database.getLastBlock()
      .then((lastBlock: Block) => {
        expect(lastBlock.hash.buffer).toEqual(block.hash.buffer.toJSON())
        done()
      })
      .catch((err: Error) => {
        throw err
      })
  })

  it('can get lastBlockHash', done => {
    database.getLastBlockHash()
      .then((hash: Hash) => {
        expect(hash.buffer).toEqual(block.hash.buffer.toJSON())
        done()
      })
      .catch((err: Error) => {
        throw err
      })
  })

  it('can get height', done => {
    database.getHeight()
      .then((height: number) => {
        expect(height).toEqual(1)
        done()
      })
      .catch((err: Error) => {
        throw err
      })
  })
})
