/*
  Copyright 2018 Bit Factory, Inc.
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

const SampleToken = artifacts.require("./SampleToken.sol");

module.exports = function (deployer) {
  const genesis = require('../../uniqys-node/genesisHash.json')
  const conf = require('../../uniqys-node/dapp.json')
  const addresses = conf.validatorSet.map(v => `0x${v.address}`)
  const powers = conf.validatorSet.map(v => v.power)
  deployer.deploy(SampleToken, `0x${genesis.genesisHash}`, addresses, powers)
};
