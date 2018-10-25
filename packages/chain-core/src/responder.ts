import { Blockchain, BlockBody, BlockHeader } from '@uniqys/blockchain'
import { Protocol, Message } from '@uniqys/protocol'

export class Responder {
  constructor (
    private readonly blockchain: Blockchain
  ) {}

  public async getConsentedHeader (msg: Message.GetConsentedHeader, _: Protocol): Promise<Message.ConsentedHeader> {
    const header = await this.blockchain.headerOf(msg.height)
    const consensus = await this.blockchain.consensusOf(msg.height)
    return new Message.ConsentedHeader(header, consensus)
  }

  public async getHeaders (msg: Message.GetHeaders, _: Protocol): Promise<Message.Headers> {
    const i = msg.from
    const last = Math.min(await this.blockchain.height, i + msg.count - 1)
    const headers: BlockHeader[] = []
    for (let i = msg.from; i <= last; i++) {
      headers.push(await this.blockchain.headerOf(i))
    }
    return new Message.Headers(headers)
  }

  public async getBodies (msg: Message.GetBodies, _: Protocol): Promise<Message.Bodies> {
    const i = msg.from
    const last = Math.min(await this.blockchain.height, i + msg.count - 1)
    const bodies: BlockBody[] = []
    for (let i = msg.from; i <= last; i++) {
      bodies.push(await this.blockchain.bodyOf(i))
    }
    return new Message.Bodies(bodies)
  }
}
