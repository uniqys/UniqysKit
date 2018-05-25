import { Blockchain } from './structure/blockchain'
import { InMemoryBlockStore } from './store/block'
import { Block } from './structure/blockchain/block'
import { TransactionList } from './structure/blockchain/transaction'
import { Consensus, ValidatorSet, Validator } from './structure/blockchain/consensus'
import { Hash, KeyPair } from './structure/cryptography'

// Blockchainの使いまわし方が見えたら Blockchain.tsと合体するかも
export class BlockchainDefault {

  private static _instance: Blockchain

  public static get instance (): Blockchain {
    if (!this._instance) {
      let signer = new KeyPair()
      let validatorSet = new ValidatorSet([ new Validator(signer.address, 100) ])
      let genesis = Block.construct(1, 100, Hash.fromData('genesis'), Hash.fromData('state'),
      new TransactionList([]), new Consensus([]), validatorSet)
      this._instance = new Blockchain(new InMemoryBlockStore(), genesis)
    }

    return this._instance
  }
}
