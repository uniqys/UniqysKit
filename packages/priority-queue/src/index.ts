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

export namespace Utility {
  export interface Item<T> {
    priority: number,
    value: T
  }
  export function descending<T> () {
    return (item1: Item<T>, item2: Item<T>) => item1.priority - item2.priority
  }
  export function ascending<T> () {
    return (item1: Item<T>, item2: Item<T>) => item2.priority - item1.priority
  }
}
export class PriorityQueue<T> {
  private _memory: (T | undefined)[] = []
  private _size = 0
  constructor (
    private readonly compare: (item1: T, item2: T) => number
  ) {}

  public enqueue (item: T) {
    this._memory[this._size] = item
    this._size++
    for (let i = this._size - 1; i > 0;) {
      const parent = (i - 1) >> 1
      if (this.compare(this._memory[i]!, this._memory[parent]!) < 0) { break }
      const tmp = this._memory[i]
      this._memory[i] = this._memory[parent]
      this._memory[parent] = tmp
      i = parent
    }
  }

  public peek (): T | undefined {
    if (this._size === 0) { return undefined }
    return this._memory[0]
  }

  public dequeue (): T | undefined {
    if (this._size === 0) { return undefined }
    const ret = this._memory[0]
    this._size--
    this._memory[0] = this._memory[this._size]
    this._memory[this._size] = undefined
    if (this._size === 0) { return ret }
    const stop = this._size >> 1
    for (let i = 0; i < stop;) {
      const left = (i << 1) + 1
      const right = left + 1
      const child = (right >= this._size || this.compare(this._memory[left]!, this._memory[right]!) > 0) ? left : right
      if (this.compare(this._memory[i]!, this._memory[child]!) > 0) { break }
      const tmp = this._memory[i]
      this._memory[i] = this._memory[child]
      this._memory[child] = tmp
      i = child
    }
    return ret
  }
}
