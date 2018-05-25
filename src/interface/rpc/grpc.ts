import service from './protobuf/dapi_grpc_pb'
import message from './protobuf/dapi_pb'
import grpc from 'grpc'
import { Dapp, Core, AppState } from '../dapi'
import { Transaction, TransactionData } from '../../structure/blockchain/transaction'
import { Hash, Signature } from '../../structure/cryptography'
import { uint8ArrayToBuffer, bufferToUint8Array } from '../../utility/buffer'
import debug from 'debug'
const logger = debug('grpc')

class ServiceError implements grpc.ServiceError {
  public readonly code = grpc.status.UNKNOWN // need more specific definition
  public readonly metadata = undefined
  public readonly message: string
  public readonly stack = undefined
  constructor (
    public name: string,
    message?: string
  ) {
    this.message = message ? message : ''
  }
}
class SendTransactionError extends ServiceError {
  constructor (message?: string) { super('SendTransactionError', message) }
}

class ConnectError extends ServiceError {
  constructor (message ?: string) { super('ConnectError', message) }
}

class ExecuteError extends ServiceError {
  constructor (message?: string) { super('ExecuteError', message) }
}

export class GrpcDapp implements Dapp {
  private readonly client: service.DappClient

  constructor (
    address: string
  ) {
    this.client = new service.DappClient(address, grpc.credentials.createInsecure())
  }

  public serve (core: Core, listen: string): grpc.Server {
    const server = new grpc.Server()
    server.addService<service.CoreServiceImplementation>(service.CoreService, {
      sendTransaction: (call, callback) => {
        logger('handle send transaction')
        const tx = new Transaction(
          new Signature(uint8ArrayToBuffer(call.request.getSign_asU8())),
          new TransactionData(
            call.request.getNonce(),
            uint8ArrayToBuffer(call.request.getData_asU8())
          )
        )
        core.sendTransaction(tx)
          .then(() => { callback(null, new message.Empty()) })
          .catch(err => { callback(new SendTransactionError(err), null) })
      }
    })
    server.bind(listen, grpc.ServerCredentials.createInsecure())
    server.start()
    logger('start grpc server %s', listen)
    return server
  }
  public connect (): Promise<AppState> {
    return new Promise<AppState>((resolve, reject) => {
      this.client.connect(new message.Empty(), (err, res) => {
        if (err) { return reject(err) }
        logger('connected')
        resolve(new AppState(res.getHeight(), new Hash(uint8ArrayToBuffer(res.getHash_asU8()))))
      })
    })
  }

  public execute (transactions: Iterable<Transaction>): Promise < AppState > {
    return new Promise<AppState>((resolve, reject) => {
      const pb = new message.ExecuteRequest()
      const txs: message.Transaction[] = []
      for (const tx of transactions) {
        const pb = new message.Transaction()
        pb.setSign(bufferToUint8Array(tx.sign.buffer))
        pb.setNonce(tx.data.nonce)
        pb.setData(bufferToUint8Array(tx.data.data))
        txs.push(pb)
      }
      pb.setTransactionsList(txs)
      this.client.execute(pb, (err, res) => {
        if (err) { return reject(err) }
        logger('executed')
        resolve(new AppState(res.getHeight(), new Hash(uint8ArrayToBuffer(res.getHash_asU8()))))
      })
    })
  }
}

// for dapp implementation
export class GrpcCore implements Core {
  private readonly client: service.CoreClient

  constructor (
    address: string
  ) {
    this.client = new service.CoreClient(address, grpc.credentials.createInsecure())
  }

  public serve (dapp: Dapp, listen: string): grpc.Server {
    let server = new grpc.Server()
    server.addService<service.DappServiceImplementation>(service.DappService, {
      connect: (_, callback) => {
        logger('handle connect')
        dapp.connect()
          .then(appState => {
            const pb = new message.AppState()
            pb.setHeight(appState.height)
            pb.setHash(bufferToUint8Array(appState.hash.buffer))
            callback(null, pb)
          })
          .catch(err => {
            callback(new ConnectError(err), null)
          })
      },
      execute: (call, callback) => {
        logger('handle execute')
        dapp.execute(
          call.request.getTransactionsList()
            .map(pb => new Transaction(
              new Signature(uint8ArrayToBuffer(pb.getSign_asU8())),
              new TransactionData(pb.getNonce(), uint8ArrayToBuffer(pb.getData_asU8()))
            )
          )
        )
          .then(appState => {
            const pb = new message.AppState()
            pb.setHeight(appState.height)
            pb.setHash(bufferToUint8Array(appState.hash.buffer))
            callback(null, pb)
          })
          .catch(err => {
            callback(new ExecuteError(err), null)
          })
      }
    })
    server.bind(listen, grpc.ServerCredentials.createInsecure())
    server.start()
    logger('start grpc server %s', listen)
    return server
  }
  public sendTransaction (transaction: Transaction): Promise < void > {
    return new Promise((resolve, reject) => {
      const pb = new message.Transaction()
      pb.setSign(bufferToUint8Array(transaction.sign.buffer))
      pb.setNonce(transaction.data.nonce)
      pb.setData(bufferToUint8Array(transaction.data.data))
      this.client.sendTransaction(pb, (err, _) => {
        if (err) { return reject(err) }
        logger('sent transaction')
        resolve()
      })
    })
  }
}
