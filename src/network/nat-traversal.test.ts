import { NatTraversal } from './nat-traversal'

describe('Nat Traversal', () => {
  let location: string
  let service: any
  let continueTest = true

  it('can get root device', done => {
    NatTraversal.discoverRootDeviceAsync()
      .then((headers) => {
        expect(headers.LOCATION).toBeDefined()
        location = headers.LOCATION
        done()
      })
      .catch(() => {
        continueTest = false
        done()
      })
  })

  if (continueTest) {
    console.log('Exit from Nat traversal test.')
    return
  }

  it('can get device info', done => {
    NatTraversal.getRootDeviceInfoAsync(location)
      .then((data) => {
        service = NatTraversal.findServicesFromDeviceInfo(data)
        done()
      })
      .catch((err) => {
        console.log(err)
        done()
      })
  })

  it('can not get services from empty string', () => {
    let services = NatTraversal.findServicesFromDeviceInfo({})
    expect(services).toBeUndefined()
  })

  it('can not get services from invalid string', () => {
    let services = NatTraversal.findServicesFromDeviceInfo({
      device: {
        deviceType: {
          _text: 'InternetGatewayDevice:1'
        }
      },
      serviceList: {}
    })
    expect(services).toBeUndefined()
  })

  it('can get external ip address', done => {
    NatTraversal.getExternalIpAsync(`${location}${service.controlURL._text}`)
      .then(res => {
        console.log(res.status, res.data)
        done()
      })
      .catch(err => {
        console.log(err.response)
        done()
      })
  })

  it('can add port mapping', done => {
    NatTraversal.addPortMappingAsync(`${location}${service.controlURL._text}`)
      .then(res => {
        console.log(res.status, res.data)
        done()
      })
      .catch(err => {
        console.log(err.response)
        done()
      })
  })

  it('can delete port mapping', done => {
    NatTraversal.deletePortMappingAsync(`${location}${service.controlURL._text}`)
      .then(res => {
        console.log(res.status, res.data)
        done()
      })
      .catch(err => {
        console.log(err.response)
        done()
      })
  })
})
