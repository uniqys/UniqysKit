import { Block, BlockHeader, BlockData, Consensus, Blockchain, ValidatorSet, Validator } from './structure/blockchain'
import { Hash, KeyPair } from './structure/cryptography'
import { MerkleTree } from './structure/merkle-tree'

// Blockchainの使いまわし方が見えたら Blockchain.tsと合体するかも
export class BlockchainDefault {

  private static _instance: Blockchain

  public static get instance (): Blockchain {
    if (!this._instance) {
      // FIXME ちゃんとしたgenesisBlockを作る
      const signer = new KeyPair()
      const validatorSet = new ValidatorSet([ new Validator(signer.address, 100) ])
      const genesisData = new BlockData(new MerkleTree([]), new Consensus(0, new MerkleTree([])), validatorSet)
      const genesisHeader = new BlockHeader(1, 100, Hash.fromData('genesis'),
        genesisData.transactions.root, genesisData.lastBlockConsensus.hash, genesisData.nextValidatorSet.root, Hash.fromData('state'))
      let genesisBlock = new Block(genesisData, genesisHeader)
      this._instance = new Blockchain(genesisBlock)
    }

    return this._instance
  }
}
