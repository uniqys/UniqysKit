import { Protocol } from '@uniqys/protocol'
import { Mutex } from '@uniqys/lock'
import { EventEmitter } from 'events'

export class RemoteNode {
  private readonly mutex = new Mutex()
  private readonly event = new EventEmitter()
  private _height: number
  constructor (
    public readonly peerId: string,
    public readonly protocol: Protocol,
    height: number
  ) {
    this._height = height
  }

  public onNewHeight (listener: (height: number) => void) { this.event.on('newHeight', listener) }
  public offNewHeight (listener: (height: number) => void) { this.event.off('newHeight', listener) }

  public get height () { return this._height }
  public set height (height: number) {
    if (this._height !== height) {
      this._height = height
      this.event.emit('newHeight', height)
    }
  }
  public get consensusHeight () { return this._height + 1 }

  public get isIdle () {
    return !this.mutex.locked
  }

  public use<T> (task: () => Promise<T>): Promise<T> {
    return this.mutex.use(task)
  }
}

export class RemoteNodeSet {
  private readonly node = new Map<string, RemoteNode>()
  private readonly listener = new Map<string, (height: number) => void>()
  private readonly event = new EventEmitter()
  public onNewHeight (listener: (node: RemoteNode, height: number) => void) { this.event.on('newHeight', listener) }
  public offNewHeight (listener: (node: RemoteNode, height: number) => void) { this.event.off('newHeight', listener) }

  public get size (): number {
    return this.node.size
  }

  public nodes () {
    return this.node.values()
  }

  public add (node: RemoteNode) {
    const listener = (height: number) => { this.event.emit('newHeight', node, height) }
    node.onNewHeight(listener)
    this.listener.set(node.peerId, listener)
    this.node.set(node.peerId, node)
    // tell listener
    this.event.emit('newHeight', node, node.height)
  }

  public get (peerId: string) {
    return this.node.get(peerId)
  }

  public delete (node: RemoteNode) {
    const listener = this.listener.get(node.peerId)
    if (listener) { node.offNewHeight(listener) }
    this.node.delete(node.peerId)
    this.listener.delete(node.peerId)
  }

  public bestNode () {
    let best: RemoteNode | undefined
    for (const node of this.node.values()) {
      if (!best || best.height < node.height) {
        best = node
      }
    }
    return best
  }

  public pickTransactionReceivers (rate?: number): RemoteNode[] {
    return this._pickRandomly(all => (rate ? Math.floor(Math.pow(all, rate)) : all), _ => true)
  }

  public pickBlockReceivers (height: number, rate?: number): RemoteNode[] {
    return this._pickRandomly(all => (rate ? Math.floor(Math.pow(all, rate)) : all), node => node.height < height)
  }

  public pickConsensusReceivers (consensusHeight: number): RemoteNode[] {
    // pick same height node
    // TODO: use round or/and step state?
    return this._pickRandomly(all => all, node => node.consensusHeight === consensusHeight)
  }

  public pickProvider (height: number): RemoteNode | undefined {
    return this._pickRandomly(_ => 1, node => node.height >= height)[0]
  }

  public pickIdleProvider (height: number): RemoteNode | undefined {
    return this._pickRandomly(_ => 1, node => node.height >= height && node.isIdle)[0]
  }

  private _pickRandomly (rate: (all: number) => number, condition: (node: RemoteNode) => boolean): RemoteNode[] {
    const candidates = Array.from(this.node.values()).filter(condition)
    if (candidates.length === 0) { return [] }
    const all = candidates.length
    const count = rate(all)
    if (count === all) { return candidates }
    // Randomize the first n nodes (Fisher–Yates shuffle)
    for (let i = 0; i < count; i++) {
      const r = Math.floor(Math.random() * (all - i) + i)
      const temp = candidates[i]
      candidates[i] = candidates[r]
      candidates[r] = temp
    }
    return candidates.slice(0, count)
  }
}
