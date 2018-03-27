import jayson from 'jayson'
import * as methods from './methods'
export class JsonRpc {

  public static Client = class Client {

    private client: jayson.client

    constructor (server?: jayson.server) {
      this.client = server ? new jayson.client(server) : new jayson.client.http({
        port: 3000
      })
    }

    public request (method: string , args: Array<any>, callback: Function): void {
      this.client.request(method, args, callback)
    }
  }

  private static _server: jayson.server

  public static get Server (): jayson.server {
    if (!this._server) {
      this._server = new jayson.server(methods)
      this._server.http().listen(3000)
    }
    return this._server
  }
}
