import { Blockchain, Block, TransactionList, Transaction, Consensus, ConsensusMessage, Proposal, Vote } from '@uniqys/blockchain'
import { KeyPair, Hash } from '@uniqys/signature'
import { Optional } from '@uniqys/types'
import { AsyncLoop } from '@uniqys/async-loop'
import { Message } from '@uniqys/protocol'
import { RemoteNodeSet, RemoteNode } from '../remote-node'
import { TransactionPool } from '../transaction-pool'
import { Synchronizer } from '../synchronizer'
import { Executor } from '../executor'
import { State, RoundState, VoteSet, Step } from './state'
import { EventEmitter } from 'events'
import debug from 'debug'
import { TimeoutOptions, ConsensusTimeout } from './timeout'
const logger = debug('chain-core:consensus')

export interface ConsensusOptions extends TimeoutOptions {
}
export namespace ConsensusOptions {
  export const defaults: ConsensusOptions = Object.assign({
  }, TimeoutOptions.defaults)
}

export class ConsensusEngine {
  private timeout: ConsensusTimeout
  private consensusLoop = new AsyncLoop(() => this.proceedConsensus())
  private state = new State()
  private readonly event = new EventEmitter()

  constructor (
    private readonly blockchain: Blockchain,
    private readonly remoteNode: RemoteNodeSet,
    private readonly transactionPool: TransactionPool,
    private readonly synchronizer: Synchronizer,
    private readonly executor: Executor,
    private readonly _keyPair?: KeyPair,
    options?: Partial<ConsensusOptions>
  ) {
    const consensusOptions = Object.assign({}, ConsensusOptions.defaults, options)
    this.timeout = new ConsensusTimeout(consensusOptions)
    this.consensusLoop.on('error', err => this.event.emit('error', err))
    this.remoteNode.onNewHeight((node) => this.catchUpState(node))
    this.executor.onExecuted(appState => this.setNewHeight(appState.height + 1, appState.hash))
  }
  public get isValidator () {
    return this._keyPair && this.validatorSet.exists(this._keyPair.address)
  }
  public get keyPair () {
    if (!this._keyPair) throw new Error('not set keyPair')
    return this._keyPair
  }

  public onError (listener: (err: Error) => void) { this.event.on('error', listener) }

  public async start () {
    logger('start consensus engine')
    if (this.isValidator) logger('validator %s', this.keyPair.address.toString())
    this.setNewHeight(this.executor.lastAppState.height + 1, this.executor.lastAppState.hash)
    this.consensusLoop.start()
  }
  public async stop () {
    this.consensusLoop.stop()
  }

  // message handling
  public newConsensusMessage (msg: ConsensusMessage, from: RemoteNode) {
    msg.match(
      proposal => this.handleProposal(proposal, from),
      prevote => this.handlePrevote(prevote, from),
      precommit => this.handlePrecommit(precommit, from)
    )
  }

  private handleProposal (msg: ConsensusMessage.ProposalMessage, from?: RemoteNode) {
    if (from && from.consensusHeight < msg.proposal.height) { from.height = msg.proposal.height - 1 }
    // allow feature round proposal for round skip
    if (msg.proposal.height !== this.state.height || msg.proposal.round < this.state.round) return
    if (this.state.roundStateOf(msg.proposal.round).proposal) return // known
    if (msg.proposal.lockedRound !== 0 && msg.proposal.round <= msg.proposal.lockedRound) {
      logger('invalid proposal locked round')
      return
    }
    if (!this.validatorSet.proposer(msg.proposal.height, msg.proposal.round).equals(msg.signerAddress(this.blockchain.genesisBlock.hash))) {
      logger('invalid proposal sign')
      return
    }

    // record and gossip
    this.state.roundStateOf(msg.proposal.round).proposal = msg
    this.gossip(msg)
  }

  private handlePrevote (msg: ConsensusMessage.PrevoteMessage, from?: RemoteNode) {
    if (from && from.consensusHeight < msg.vote.height) { from.height = msg.vote.height - 1 }
    if (msg.vote.height !== this.state.height) return // height mismatch
    const addr = msg.signerAddress(this.blockchain.genesisBlock.hash)
    const prevote = this.state.roundStateOf(msg.vote.round).prevote
    if (prevote.has(addr)) return // known

    // record and gossip
    prevote.add(addr, msg)
    this.gossip(msg)

    // check vote state
    this.checkRoundSkip(msg.vote.height, msg.vote.round, prevote)
    this.checkValidBlock(msg.vote.height, msg.vote.round)
  }

  private handlePrecommit (msg: ConsensusMessage.PrecommitMessage, from?: RemoteNode) {
    if (from && from.consensusHeight < msg.vote.height) { from.height = msg.vote.height - 1 }
    if (msg.vote.height !== this.state.height) return // height mismatch
    const addr = msg.signerAddress(this.blockchain.genesisBlock.hash)
    const precommit = this.state.roundStateOf(msg.vote.round).precommit
    if (precommit.has(addr)) return // known

    // record and gossip
    precommit.add(addr, msg)
    this.gossip(msg)

    // check vote state
    this.checkRoundSkip(msg.vote.height, msg.vote.round, precommit)
  }

  // main consensus loop
  private async proceedConsensus () {
    await this.state.lock.writeLock.use(async () => {
      switch (this.state.step) {
        case Step.NewRound:
          await this.doNewRound()
          break
        case Step.Propose:
          await this.doPropose()
          break
        case Step.Prevote:
        case Step.PrevoteWait:
          await this.doPrevoteOrWait()
          break
        case Step.Precommit:
        case Step.PrecommitWait:
          await this.doPrecommitOrWait()
          break
      }
    })
  }

  private async doNewRound () {
    if (this.state.currentRoundState.proposal) {
      this.state.step = Step.Propose
      return
    }
    if (this.state.validBlock) {
      logger('enter propose: valid block')
      await this.enterPropose()
      return
    }
    if (this.state.height === 1) {
      logger('enter propose: genesis')
      await this.enterPropose()
      return
    }
    if (!this.state.appStateHash.equals((await this.blockchain.blockOf(this.state.height - 1)).header.appStateHash)) {
      logger('enter propose: need appState proof block')
      await this.enterPropose()
      return
    }
    const transactions = await this.transactionPool.selectTransactions()
    if (transactions.length > 0) {
      logger('enter propose: has transactions')
      await this.enterPropose(transactions)
      return
    }
  }

  private async enterPropose (transactions?: Transaction[]) {
    const height = this.state.height
    const round = this.state.round
    if (this.isValidator && this.validatorSet.proposer(height, round).equals(this.keyPair.address)) {
      await this.sendProposalMessage(transactions || await this.transactionPool.selectTransactions())
      this.state.step = Step.Propose
      return
    } else {
      this.setTimeout(() => this.state.lock.writeLock.use(async () => {
        if (this.state.height === height && this.state.round === round && this.state.step === Step.Propose) {
          logger('propose timeout')
          await this.sendPrevoteMessage(Optional.none())
          this.state.step = Step.Prevote
        }
      }), this.timeout.propose(round))
      this.state.step = Step.Propose
    }
  }

  private async doPropose () {
    const msg = this.state.currentRoundState.proposal
    if (!msg) return
    const proposal = msg.proposal

    const isLockedBlock = this.state.lockedBlock && this.state.lockedBlock.hash.equals(proposal.block.hash)

    // invalid block
    if (!this.validateBlock(proposal.block)) {
      await this.sendPrevoteMessage(Optional.none())
      this.state.step = Step.Prevote
      return
    }

    // proposer locked before our locked, but proposal is not the locked block
    if ((this.state.lockedRound > proposal.lockedRound && !isLockedBlock)) {
      await this.sendPrevoteMessage(Optional.none())
      this.state.step = Step.Prevote
      return
    }

    // not locked or proposal is the locked block
    if (this.state.lockedRound === 0 || isLockedBlock) {
      await this.sendPrevoteMessage(Optional.some(proposal.block.hash))
      this.state.step = Step.Prevote
      return
    }

    // proposer locked round has super majority prevote
    if (this.state.lockedRound <= proposal.lockedRound
      && this.state.roundStateOf(proposal.lockedRound).prevote.twoThirdsMajority.match(v => v.blockHash.equals(proposal.block.hash), () => false)) {
      await this.sendPrevoteMessage(Optional.some(proposal.block.hash))
      this.state.step = Step.Prevote
      return
    }

    return
  }

  private async doPrevoteOrWait () {
    const prevote = this.state.currentRoundState.prevote
    const majority = prevote.twoThirdsMajority
    if (majority.isSome()) {
      const vote = majority.value
      const msg = this.state.currentRoundState.proposal
      // +2/3 prevote for block
      if (msg && vote.blockHash.equals(msg.proposal.block.hash)) {
        logger('+2/3 prevote for block')
        this.state.lockedRound = this.state.round
        this.state.lockedBlock = msg.proposal.block
        await this.sendPrecommitMessage(Optional.some(vote.blockHash))
        this.state.step = Step.Precommit
        return
      }
      // +2/3 prevote for nil
      if (vote.blockHash.equals(Hash.zero)) {
        logger('+2/3 prevote for nil')
        await this.sendPrecommitMessage(Optional.none())
        this.state.step = Step.Precommit
        return
      }
    }
    // +2/3 prevote for any
    if (this.state.step === Step.Prevote && prevote.twoThirdsAny) {
      const height = this.state.height
      const round = this.state.round
      this.setTimeout(async () => {
        if (this.state.height === height && this.state.round === round && this.state.step === Step.PrevoteWait) {
          logger('prevote timeout')
          await this.sendPrecommitMessage(Optional.none())
          this.state.step = Step.Precommit
        }
      }, this.timeout.prevote(round))
      this.state.step = Step.PrevoteWait
      return
    }
  }

  private async doPrecommitOrWait () {
    const precommit = this.state.currentRoundState.precommit
    const majority = precommit.twoThirdsMajority
    if (majority.isSome()) {
      const vote = majority.value
      const msg = this.state.currentRoundState.proposal
      // +2/3 precommit for block
      if (msg && vote.blockHash.equals(msg.proposal.block.hash)) {
        logger('+2/3 precommit for block')
        await this.commitBlock(precommit, msg.proposal.block)
        return
      }
      // +2/3 precommit for nil
      if (vote.blockHash.equals(Hash.zero)) {
        logger('+2/3 precommit for nil')
        this.state.newRound(this.state.round + 1)
        return
      }
    }
    // +2/3 precommit for any
    if (this.state.step === Step.Precommit && precommit.twoThirdsAny) {
      const height = this.state.height
      const round = this.state.round
      this.setTimeout(async () => {
        if (this.state.height === height && this.state.round === round && this.state.step === Step.PrecommitWait) {
          logger('precommit timeout')
          this.state.newRound(this.state.round + 1)
        }
      }, this.timeout.precommit(round))
      this.state.step = Step.PrecommitWait
      return
    }
  }

  private async validateBlock (block: Block): Promise<boolean> {
    try {
      if (block.header.height !== this.state.height) throw new Error('invalid height')
      block.validate()
      if (this.state.height === 1) {
        // genesis block
        if (!block.hash.equals(this.blockchain.genesisBlock.hash)) throw new Error('invalid genesis block')
      } else {
        const lastBlockHeader = await this.blockchain.headerOf(this.state.height - 1)
        if (!block.header.lastBlockHash.equals(lastBlockHeader.hash)) throw new Error('lastBlockHash mismatch')
        if (!block.header.appStateHash.equals(this.state.appStateHash)) throw new Error('appStateHash mismatch')
      }
      return true
    } catch (err) {
      logger('validate block error: %s', err.message)
      return false
    }
  }

  private async commitBlock (precommit: VoteSet<ConsensusMessage.PrecommitMessage>, block: Block) {
    const majority = precommit.twoThirdsMajority
    if (!majority.isSome()) throw new Error('cant commit block: no +2/3 precommit')
    const vote = majority.value
    const consensus = new Consensus(vote, precommit.signatures(vote.blockHash))
    this.synchronizer.newBlockFromLocal(block, consensus)
    this.state.step = Step.Committed

    logger(`commit block(${block.header.height}): ${block.hash.buffer.toString('hex')}`)
  }

  private catchUpState (node: RemoteNode) {
    // send known messages to node which became the same height
    if (node.consensusHeight === this.state.height) {
      this.sendRoundState(node, this.state.currentRoundState).catch(err => this.event.emit('error', err))
    }
  }

  private checkValidBlock (height: number, round: number) {
    this.state.lock.writeLock.use(async () => {
      if (this.state.height !== height) return
      if (round <= this.state.validRound) return
      const majority = this.state.roundStateOf(round).prevote.twoThirdsMajority
      if (majority.isSome()) {
        const vote = majority.value
        const msg = this.state.roundStateOf(round).proposal
        // +2/3 prevote for block
        if (msg && vote.blockHash.equals(msg.proposal.block.hash)) {
          logger('see valid block %s', msg.proposal.block.hash.toHexString())
          this.state.validRound = round
          this.state.validBlock = msg.proposal.block
        }
      }
    }).catch(err => this.event.emit('error', err))
  }

  private checkRoundSkip (height: number, round: number, vote: VoteSet<ConsensusMessage.VoteMessage>) {
    this.state.lock.writeLock.use(async () => {
      if (this.state.height !== height) return
      if (round <= this.state.round) return
      if (vote.oneThirdAny) {
        logger('skip round %d -> %d', this.state.round, round)
        this.state.newRound(round)
      }
    }).catch(err => this.event.emit('error', err))
  }

  private async sendRoundState (node: RemoteNode, roundState: RoundState) {
    if (roundState.proposal) {
      await node.protocol.sendNewConsensusMessage(new Message.NewConsensusMessage(roundState.proposal))
    }
    for (const msg of roundState.prevote.messages()) {
      await node.protocol.sendNewConsensusMessage(new Message.NewConsensusMessage(msg))
    }
    for (const msg of roundState.precommit.messages()) {
      await node.protocol.sendNewConsensusMessage(new Message.NewConsensusMessage(msg))
    }
  }

  private async sendProposalMessage (transactions: Transaction[]) {
    if (!this.isValidator) return
    const block =
      this.state.validBlock ? this.state.validBlock :
      this.state.height === 1 ? this.blockchain.genesisBlock :
      await (async () => {
        const lastBlockHash = await this.blockchain.hashOf(this.state.height - 1)
        const lastBlockConsensus = await this.blockchain.consensusOf(this.state.height - 1)
        const nextValidatorSet = this.validatorSet // static validator set
        return Block.construct(
          this.state.height, Math.floor((new Date().getTime()) / 1000), lastBlockHash,
          nextValidatorSet.hash, this.state.appStateHash,
          new TransactionList(transactions), lastBlockConsensus
        )
      })()

    const proposal = new Proposal(this.state.height, this.state.round, this.state.validRound, block)
    const msg = ConsensusMessage.proposal(proposal, this.blockchain.genesisBlock.hash, this.keyPair)
    logger('propose: (%d, %d) %s', proposal.height, proposal.round, proposal.block.hash.toHexString())
    this.handleProposal(msg)
  }

  private async sendPrevoteMessage (blockHash: Optional<Hash>) {
    if (!this.isValidator) return
    const vote = new Vote(this.state.height, this.state.round, blockHash.match(hash => hash, () => Hash.zero))
    const msg = ConsensusMessage.prevote(vote, this.blockchain.genesisBlock.hash, this.keyPair)
    logger('prevote: (%d, %d) %s', vote.height, vote.round, vote.blockHash.toHexString())
    this.handlePrevote(msg)
  }

  private async sendPrecommitMessage (blockHash: Optional<Hash>) {
    if (!this.isValidator) return
    const vote = new Vote(this.state.height, this.state.round, blockHash.match(hash => hash, () => Hash.zero))
    const msg = ConsensusMessage.precommit(vote, this.blockchain.genesisBlock.hash, this.keyPair)
    logger('precommit: (%d, %d) %s', vote.height, vote.round, vote.blockHash.toHexString())
    this.handlePrecommit(msg)
  }

  private gossip (msg: ConsensusMessage) {
    Promise.all(this.remoteNode.pickConsensusReceivers(msg.match(p => p.proposal.height, v => v.vote.height, c => c.vote.height))
      .map(node => node.protocol.sendNewConsensusMessage(new Message.NewConsensusMessage(msg))))
      .catch(err => this.event.emit('error', err))
  }

  private setTimeout (task: () => Promise<void> , ms: number) {
    setTimeout(() => task().catch(err => this.event.emit('error', err)), ms)
  }

  private setNewHeight (height: number, appStateHash: Hash) {
    this.state.lock.writeLock.use(async () => {
      logger('new height %d with app state %s', height, appStateHash.toHexString())
      this.state.newHeight(height, appStateHash, this.validatorSet)
    }).catch(err => this.event.emit('error', err))
  }

  private get validatorSet () {
    return this.blockchain.initialValidatorSet
  }
}
