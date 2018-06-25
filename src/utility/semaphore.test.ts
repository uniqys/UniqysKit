import * as semaphoreUtil from './semaphore'
import Semaphore from 'semaphore'
import { promisify } from 'util'

describe('semaphore util', () => {
  it('take semaphore async', (done) => {
    const semaphore = Semaphore(1)
    semaphoreUtil.takeAsync(semaphore, async () => {
      await promisify(setTimeout)(50)
    }).then(() => {
      expect(semaphore.available(1)).toBeTruthy()
      done()
    }).catch(err => done.fail(err))
    expect(semaphore.available(1)).not.toBeTruthy()
  })
})
