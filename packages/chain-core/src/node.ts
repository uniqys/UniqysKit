import { Blockchain, Transaction } from '@uniqys/blockchain'
import * as dapi from '@uniqys/dapp-interface'
import { Network, NetworkOptions } from '@uniqys/p2p-network'
import { KeyPair } from '@uniqys/signature'
import { Protocol, ProtocolMeta, Message } from '@uniqys/protocol'
import { RemoteNodeSet, RemoteNode } from './remote-node'
import { Synchronizer } from './synchronizer'
import { TransactionPool } from './transaction-pool'
import { Executor } from './executor'
import { ConsensusEngine } from './consensus-engine'
import { Responder } from './responder'
import { EventEmitter } from 'events'
import PeerInfo from 'peer-info'
import PeerId from 'peer-id'
import debug from 'debug'
const logger = debug('chain-core:node')

export interface NodeOptions extends NetworkOptions {
  handshakeTimeout: number
}
export namespace NodeOptions {
  export const defaults: NodeOptions = Object.assign({
    handshakeTimeout: 1000
  }, NetworkOptions.defaults)
}

export class Node implements dapi.Core {
  public readonly blockchain: Blockchain
  private readonly transactionPool: TransactionPool
  private readonly synchronizer: Synchronizer
  private readonly executor: Executor
  private readonly consensusEngine: ConsensusEngine
  private readonly event = new EventEmitter()
  private readonly dapp: dapi.Dapp
  private readonly network: Network
  private readonly remoteNode = new RemoteNodeSet()
  private readonly options: NodeOptions
  private readonly responder: Responder

  constructor (
    dapp: dapi.Dapp,
    blockchain: Blockchain,
    peerInfo: PeerInfo,
    keyPair?: KeyPair,
    options?: Partial<NodeOptions>
  ) {
    this.dapp = dapp
    this.blockchain = blockchain
    this.options = Object.assign({}, NodeOptions.defaults, options)

    this.executor = new Executor(this.blockchain, this.dapp)
    this.executor.onExecuted((_height, txs) => {
      this.transactionPool.update(txs).catch(err => this.event.emit('error', err))
    })

    this.responder = new Responder(this.blockchain)

    this.synchronizer = new Synchronizer(
      this.blockchain,
      this.remoteNode,
      (node) => this.dropRemoteNode(node)
    )
    this.synchronizer.onError(err => this.event.emit('error', err))

    this.transactionPool = new TransactionPool(
      this.remoteNode,
      (tx) => this.dapp.validateTransaction(tx),
      (txs) => this.dapp.selectTransactions(txs)
    )

    this.consensusEngine = new ConsensusEngine(
      this.blockchain,
      this.remoteNode,
      this.transactionPool,
      this.synchronizer,
      this.executor,
      keyPair
    )
    this.consensusEngine.onError(err => this.event.emit('error', err))

    this.network = new Network(peerInfo, this.options)
    this.network.onError(err => {
      if (err.message === 'underlying socket has been closed') { return } // TODO: OK?
      this.event.emit('error', err)
    })
    this.network.addProtocol(new ProtocolMeta({
      handshake: (protocol, incoming) => this.handshake(protocol, incoming),
      hello: (msg, protocol) => this.hello(msg, protocol),
      newTransaction: (msg, _protocol) => {
        this.transactionPool.add(msg.transaction).catch(err => this.event.emit('error', err))
      },
      newBlock: (msg, protocol) => {
        const node = this.getRemoteNode(protocol)
        this.synchronizer.newBlock(msg, node)
      },
      newBlockHeight: (msg, protocol) => {
        const node = this.getRemoteNode(protocol)
        this.synchronizer.newBlockHeight(msg, node)
      },
      newConsensusMessage: (msg, protocol) => {
        const node = this.getRemoteNode(protocol)
        this.consensusEngine.newConsensusMessage(msg.message, node)
      },
      getConsentedHeader: (msg, protocol) => this.responder.getConsentedHeader(msg, protocol),
      getHeaders: (msg, protocol) => this.responder.getHeaders(msg, protocol),
      getBodies: (msg, protocol) => this.responder.getBodies(msg, protocol)
    }))
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }
  public onExecuted (listener: (height: number) => void) { this.event.on('executed', listener) }

  public async start (): Promise<void> {
    await this.initialize()
    this.executor.start()
    this.synchronizer.start()
    await this.consensusEngine.start()
    await this.network.start()
  }

  public async stop (): Promise<void> {
    for (const node of this.remoteNode.nodes()) { node.protocol.end() }
    await this.network.stop()
    await this.consensusEngine.stop()
    this.synchronizer.stop()
    this.executor.stop()
  }

  public async sendTransaction (transaction: Transaction) {
    await this.transactionPool.add(transaction)
  }

  private getRemoteNode (protocol: Protocol): RemoteNode {
    const node = this.remoteNode.get(protocol.peerId)
    if (!node) throw new Error('Remote node disappeared')
    return node
  }

  private async handshake (protocol: Protocol, incoming: boolean) {
    logger('handshake %s %s %s', this.network.localPeer.id.toB58String() , incoming ? '<--' : '-->', protocol.peerId)
    protocol.onError(err => {
      if (err.message === 'underlying socket has been closed') { return } // TODO: OK?
      this.event.emit('error', err)
    })
    // drop the peer that can not connect before timeout
    protocol.start()
    await protocol.sendHello(new Message.Hello((await this.blockchain.height), this.blockchain.genesisBlock.hash))

    setTimeout(() => {
      if (!this.remoteNode.get(protocol.peerId)) {
        logger('handshake timeout %s', protocol.peerId)
        this.dropPeer(protocol.peerId)
      }
    }, this.options.handshakeTimeout)
  }

  private hello (msg: Message.Hello, protocol: Protocol): void {
    if (msg.genesis.equals(this.blockchain.genesisBlock.hash)) {
      logger('success handshake with %s height: %d genesis: %s ', protocol.peerId, msg.height, msg.genesis.buffer.toString('hex'))
      const node = new RemoteNode(protocol.peerId, protocol, msg.height)
      this.addRemoteNode(node)
      protocol.onEnd(() => {
        logger('goodby %s', node.peerId)
        this.remoteNode.delete(node)
      })
    } else {
      logger('this peer is on another chain %s', protocol.peerId)
      this.dropPeer(protocol.peerId)
    }
  }

  private addRemoteNode (node: RemoteNode) {
    this.remoteNode.add(node)
    this.synchronizer.newNode()
  }

  private dropRemoteNode (node: RemoteNode) {
    this.remoteNode.delete(node)
    this.dropPeer(node.peerId)
  }

  private dropPeer (id: string) {
    this.network.dropPeer(PeerId.createFromB58String(id))
  }

  private async initialize () {
    // make db ready
    await this.blockchain.ready()
    await this.executor.initialize()
  }
}
