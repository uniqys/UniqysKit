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

import { PriorityQueue, Utility } from '.'

describe('Priority Queue', () => {
  it('dequeue value ascending order by priority', () => {
    const pq = new PriorityQueue(Utility.ascending<string>())
    expect(pq.dequeue()).toBeUndefined()
    pq.enqueue({ priority: 10, value: 'bar' })
    pq.enqueue({ priority: 2, value: 'buzz' })
    pq.enqueue({ priority: 5, value: 'foo' })
    pq.enqueue({ priority: 8, value: 'fizz' })
    expect(pq.dequeue()).toEqual({ priority: 2, value: 'buzz' })
    expect(pq.dequeue()).toEqual({ priority: 5, value: 'foo' })
    expect(pq.dequeue()).toEqual({ priority: 8, value: 'fizz' })
    pq.enqueue({ priority: 3, value: 'meow' })
    expect(pq.dequeue()).toEqual({ priority: 3, value: 'meow' })
    expect(pq.dequeue()).toEqual({ priority: 10, value: 'bar' })
    pq.enqueue({ priority: 1, value: 'buzz' })
    pq.enqueue({ priority: 6, value: 'foo' })
    pq.enqueue({ priority: 4, value: 'bar' })
    expect(pq.dequeue()).toEqual({ priority: 1, value: 'buzz' })
    expect(pq.dequeue()).toEqual({ priority: 4, value: 'bar' })
    expect(pq.dequeue()).toEqual({ priority: 6, value: 'foo' })
    expect(pq.dequeue()).toBeUndefined()
  })
  it('dequeue value descending order by priority', () => {
    const pq = new PriorityQueue(Utility.descending<string>())
    expect(pq.dequeue()).toBeUndefined()
    pq.enqueue({ priority: 5, value: 'foo' })
    pq.enqueue({ priority: 8, value: 'buzz' })
    pq.enqueue({ priority: 2, value: 'fizz' })
    expect(pq.dequeue()).toEqual({ priority: 8, value: 'buzz' })
    expect(pq.dequeue()).toEqual({ priority: 5, value: 'foo' })
    expect(pq.dequeue()).toEqual({ priority: 2, value: 'fizz' })
    expect(pq.dequeue()).toBeUndefined()
  })
  it('peek most priority value', () => {
    const pq = new PriorityQueue(Utility.ascending<string>())
    expect(pq.peek()).toBeUndefined()
    pq.enqueue({ priority: 5, value: 'bar' })
    pq.enqueue({ priority: 3, value: 'foo' })
    expect(pq.peek()).toEqual({ priority: 3, value: 'foo' })
    expect(pq.peek()).toEqual({ priority: 3, value: 'foo' })
    pq.dequeue()
    expect(pq.peek()).toEqual({ priority: 5, value: 'bar' })
  })
})
