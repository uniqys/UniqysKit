/*
  Copyright 2018 Bit Factory, Inc.

  This Source Code Form is subject to the terms of the Mozilla Public
  License, v. 2.0. If a copy of the MPL was not distributed with this
  file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

import libp2p, { Options } from 'libp2p'
import PeerInfo from 'peer-info'
import PeerBook from 'peer-book'
import { NetworkOptions } from './network'
// transport
const TCP = require('libp2p-tcp')
// stream multiplexer
const Mplex = require('libp2p-mplex')
// discovery
const Bootstrap = require('libp2p-bootstrap')
const MulticastDNS = require('libp2p-mdns')
// crypto channel
const SECIO = require('libp2p-secio')
// dht (include peer routing, content routing)
const KadDHT = require('libp2p-kad-dht')

export class Libp2pBundle extends libp2p {
  constructor (peerInfo: PeerInfo, peerBook: PeerBook, options: NetworkOptions) {
    const _options: Options = {
      peerInfo: peerInfo,
      peerBook: peerBook,
      modules: {
        transport: [new TCP()],
        streamMuxer: [Mplex],
        connEncryption: [SECIO],
        peerDiscovery: [MulticastDNS, Bootstrap],
        dht: KadDHT
      },
      config: options.libp2pConfig
    }

    super(_options)
  }
}
