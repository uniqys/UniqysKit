import { Test } from 'sample'

describe('test', () => {
  it('can get property', () => {
    expect(new Test('meow').getProperty()).toBe('meow')
  })
})
