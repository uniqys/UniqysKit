import { NatTraversal } from './'

describe('Nat Traversal', () => {
  let location: string
  let service: any
  let hasGreatWall = false

  it('can get root device', async () => {
    try {
      let headers = await NatTraversal.discoverRootDeviceAsync()
      location = headers.LOCATION
    } catch (e) {
      console.log('@_@; Network Root Device is undefined. Skip Nat Traversal tests.')
      hasGreatWall = true
    }
  })

  // if (hasGreatWall) {
  //   console.log('Exit from Nat traversal test.')
  //   return
  // }

  it('can get device info', async () => {
    if (hasGreatWall) return
    let res = await NatTraversal.getRootDeviceInfoAsync(location)
    service = NatTraversal.findServicesFromDeviceInfo(res)
    expect(service).toBeDefined()
  })

  it('can not get service from empty string', () => {
    let service = NatTraversal.findServicesFromDeviceInfo({})
    expect(service).toBeUndefined()
  })

  it('can not get service from invalid string', () => {
    let service = NatTraversal.findServicesFromDeviceInfo({
      device: {
        deviceType: {
          _text: 'InternetGatewayDevice:1'
        }
      },
      serviceList: {}
    })
    expect(service).toBeUndefined()
  })

  it('can get external ip address', async () => {
    if (hasGreatWall) return
    let res = await NatTraversal.getExternalIpAsync(`${location}${service.controlURL._text}`)
    expect(res.status).toBe(200)
  })

  it('can add port mapping', async () => {
    if (hasGreatWall) return
    let res = await NatTraversal.addPortMappingAsync(`${location}${service.controlURL._text}`)
    expect(res.status).toBe(200)
  })

  it('can delete port mapping', async () => {
    if (hasGreatWall) return
    let res = await NatTraversal.deletePortMappingAsync(`${location}${service.controlURL._text}`)
    expect(res.status).toBe(200)
  })
})
