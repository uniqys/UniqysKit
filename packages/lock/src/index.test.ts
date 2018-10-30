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

import { promisify } from 'util'
import { Mutex, ReadWriteLock } from '.'

describe('mutex', () => {
  it('make tasks run exclusively', async () => {
    const mutex = new Mutex()
    let running = 0
    let maxRunning = 0

    const tasks = new Array(10).fill(() =>
      mutex.use(async () => {
        expect(mutex.locked).toBeTruthy()
        running++
        maxRunning = Math.max(running, maxRunning)
        await promisify(setImmediate)()
        running--
      })
    )

    expect(mutex.locked).toBeFalsy()
    await Promise.all(tasks.map(t => t()))
    expect(mutex.locked).toBeFalsy()

    expect(maxRunning).toBe(1)
  })
})

describe('Read/Write lock', () => {
  it('let read task run concurrently', async () => {
    const rw = new ReadWriteLock()
    let running = 0
    let maxRunning = 0

    const tasks = new Array(10).fill(() =>
      rw.readLock.use(async () => {
        expect(rw.readLock.locked).toBeTruthy()
        running++
        maxRunning = Math.max(running, maxRunning)
        await promisify(setImmediate)()
        running--
      })
    )

    expect(rw.readLock.locked).toBeFalsy()
    await Promise.all(tasks.map(t => t()))
    expect(rw.readLock.locked).toBeFalsy()
    expect(maxRunning).toBe(10)
  })
  it('make write tasks run exclusively', async () => {
    const rw = new ReadWriteLock()
    let running = 0
    let maxRunning = 0

    const tasks = new Array(10).fill(() =>
      rw.writeLock.use(async () => {
        expect(rw.writeLock.locked).toBeTruthy()
        expect(rw.readLock.locked).toBeFalsy()
        running++
        maxRunning = Math.max(running, maxRunning)
        await promisify(setImmediate)()
        running--
      })
    )

    expect(rw.writeLock.locked).toBeFalsy()
    await Promise.all(tasks.map(t => t()))
    expect(rw.writeLock.locked).toBeFalsy()
    expect(maxRunning).toBe(1)
  })
  it('make write and read tasks run exclusively', async () => {
    const rw = new ReadWriteLock()
    let writerRunning = 0
    let readerRunning = false
    let maxRunning = 0

    const writer = () => rw.writeLock.use(async () => {
      expect(rw.writeLock.locked).toBeTruthy()
      expect(rw.readLock.locked).toBeFalsy()
      writerRunning++
      maxRunning = Math.max(writerRunning + (readerRunning ? 1 : 0), maxRunning)
      await promisify(setImmediate)()
      writerRunning--
    })
    const reader = () => rw.readLock.use(async () => {
      expect(rw.writeLock.locked).toBeFalsy()
      expect(rw.readLock.locked).toBeTruthy()
      readerRunning = true
      maxRunning = Math.max(writerRunning + (readerRunning ? 1 : 0), maxRunning)
      await promisify(setImmediate)()
      readerRunning = false
    })
    const delayWriter = async () => {
      await promisify(setImmediate)()
      await promisify(setImmediate)()
      await writer()
    }

    const tasks = [writer, reader, delayWriter, reader]

    expect(rw.writeLock.locked).toBeFalsy()
    await Promise.all(tasks.map(t => t()))
    expect(rw.writeLock.locked).toBeFalsy()
    expect(maxRunning).toBe(1)
  })
})
