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

import { AsyncLoop } from '.'

describe('async loop', () => {
  it('can start and stop loop', (done) => {
    let i = 0
    const loop = new AsyncLoop(async () => { i++ })
    expect(() => { loop.start() }).not.toThrow()
    setTimeout(() => {
      expect(i).toBeGreaterThan(0)
      loop.stop()
    }, 10)
    loop.on('end', done)
  })
  it('can stop in loop', (done) => {
    let i = 0
    const loop: AsyncLoop = new AsyncLoop(async () => {
      i++
      if (i === 10) loop.stop()
    })
    loop.start()
    loop.on('end', done) // stopped
  })
  it('emit error event on reject', (done) => {
    const loop = new AsyncLoop(() => Promise.reject(new Error(':(')))
    const handler = jest.fn()
    loop.start()
    loop.on('error', handler)
    loop.on('end', () => {
      expect(handler).toBeCalled()
      done()
    })
  })
  it('emit end event once when stop many times', () => {
    const loop = new AsyncLoop(() => Promise.resolve())
    const handler = jest.fn()
    loop.start()
    loop.on('end', handler)
    loop.stop()
    loop.stop()
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
