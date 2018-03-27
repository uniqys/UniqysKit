import { JsonRpc } from './'

describe('JsonRpcClient', () => {
  it('can create server', () => {
    expect(JsonRpc.Server).toBeDefined()
  })

  it('can create client', done => {
    let client = new JsonRpc.Client(JsonRpc.Server)
    client.request('add', [1, 2], (err: Error, res: any) => {
      expect(err).toBeNull()
      expect(res.result).toBe(3)
      done()
    })
  })

  it('can create client by host', () => {
    let client = new JsonRpc.Client()
    expect(client).toBeDefined()
  })
})
