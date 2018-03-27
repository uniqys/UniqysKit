import { BlockchainDefault } from '../BlockchainDefault'

export function add (args: Array<number>, callback: Function): void {
  callback(null, args[0] + args[1])
}

export function getblock (args: Array<number>, callback: Function) {
  callback(null, BlockchainDefault.instance.blockOf(args[0]))
}

export function getblockhash (args: Array<number>, callback: Function) {
  callback(null, BlockchainDefault.instance.blockOf(args[0]).hash)
}

export function getblockcount (callback: Function) {
  callback(null, BlockchainDefault.instance.height())
}

// ナイヨー
// export function getrawtransaction (args: Array<number>, callback: Function) {
//   callback(null, 1)
// }
