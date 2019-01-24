<!--
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
-->

<template>
  <div>
    <div class="navbar navbar-light bg-light">
      <div class="container">
        <div class="navbar-brand">Uniqys Ethereum Cross Chain</div>
        <div class="navbar-text">
          A sample of Ethereum Cross Chain.
        </div>
      </div>
    </div>
    <div class="container">
      <div class="row mt-3">
        <div class="col-sm-6">
          <div class="card">
            <h5 class="card-header">Ethereum</h5>
            <div class="card-body">
              <div v-if="eth.resolve" class="alert alert-success" role="alert">
                Success!
              </div>
              <div v-else-if="eth.reject" class="alert alert-danger" role="alert">
                Failed. {{ eth.reject }}
              </div>
              <p>
                Your address:<br>
                {{ eth.address }}<br>
                Balance:<br>
                {{ eth.balance }}
              </p>
              <p>
                <h5 class="card-title">Transfer</h5>
                <div class="input-group mt-3">
                  <input type="text" id="eth-transfer-to" class="form-control" placeholder="To" v-model="eth.transfer.to">
                  <input type="text" id="eth-transfer-value" class="form-control" placeholder="Value" v-model="eth.transfer.value">
                  <div class="input-group-append">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      id="eth-transfer-submit"
                      @click.prevent="ethTransfer"
                    >Submit</button>
                  </div>
                </div>
              </p>
              <p>
                <h5 class="card-title">Deposit</h5>
                <div class="input-group mt-3">
                  <input type="text" id="eth-deposit-value" class="form-control" placeholder="Value" v-model="eth.deposit.value">
                  <div class="input-group-append">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      id="eth-deposit-submit"
                      @click.prevent="ethDeposit"
                    >Submit</button>
                  </div>
                </div>
              </p>
            </div>
          </div>
        </div>
        <div class="col-sm-6">
          <div class="card">
            <h5 class="card-header">Uniqys</h5>
            <div class="card-body">
              <div v-if="uniqys.resolve" class="alert alert-success" role="alert">
                Success!
              </div>
              <div v-else-if="uniqys.reject" class="alert alert-danger" role="alert">
                Failed. {{ uniqys.reject }}
              </div>
              <p>
                Your address:<br>
                {{ uniqys.address }}<br>
                Balance:<br>
                {{ uniqys.balance }}
              </p>
              <h5 class="card-title">Transfer</h5>
              <div class="input-group mt-3">
                <input type="text" id="uniqys-transfer-to" class="form-control" placeholder="To" v-model="uniqys.transfer.to">
                <input type="text" id="uniqys-transfer-value" class="form-control" placeholder="Value" v-model="uniqys.transfer.value">
                <div class="input-group-append">
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    id="uniqys-transfer-submit"
                    @click.prevent="uniqysTransfer"
                  >Submit</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios'
// TODO: fetch key from web3
const keyPair = require('../confs/validatorKey.json')
const localStorageKey = 'easy_private_key'

localStorage.setItem(localStorageKey, keyPair.privateKey)
let easy = new Easy(location.origin)

export default {
  props: ['web3', 'account'],
  data () {
    return {
      contract: null,
      eth: {
        balance: 0,
        address: null,
        transfer: {
          to: null,
          value: null,
        },
        deposit: {
          value: null
        },
        resolve: null,
        reject: null
      },
      uniqys: {
        balance: 0,
        address: easy.address.toString(),
        transfer: {
          to: null,
          value: null,
        },
        resolve: null,
        reject: null
      }
    }
  },
  methods: {
    uniqysTransfer () {
      this.uniqys.resolve = null
      this.uniqys.reject = null
      if (!this.uniqys.transfer.to || !this.uniqys.transfer.value) { // 0, null, undefined
        this.uniqys.reject = 'invalid input'
        return
      }
      easy.post('/transfer', { to: this.uniqys.transfer.to, value: this.uniqys.transfer.value }, { sign: true })
        .then(() => {
          this.uniqys.resolve = true
        })
        .catch((err) => this.uniqys.reject = err.toString())
    },
    ethTransfer () {
      this.eth.resolve = null
      this.eth.reject = null
      if (!this.eth.transfer.value) { // 0, null, undefined
        this.eth.reject = 'invalid input'
        return
      }
      this.contract.methods.transfer(this.eth.transfer.to, this.eth.transfer.value).send({
        from: this.eth.address
      }, (err, txHash) => {
        if (err) {
          this.eth.reject = err
        }
        if (txHash) {
          this.eth.resolve = true
        }
      })
    },
    ethDeposit () {
      this.eth.resolve = null
      this.eth.reject = null
      if (!this.eth.deposit.value) { // 0, null, undefined
        this.eth.reject = 'invalid input'
        return
      }
      this.contract.methods.deposit(this.eth.deposit.value).send({
        from: this.eth.address
      }, (err, txHash) => {
        if (err) {
          this.eth.reject = err
        }
        if (txHash) {
          this.eth.resolve = true
        }
      })
    },
    update () {
      // eth update
      this.contract.methods.balanceOf(this.eth.address).call((err, res) => {
        if (err) { this.eth.reject = err.toString() }
        this.eth.balance = parseInt(res) || 0
      })
      // uniqys udpate
      easy.api.account(this.uniqys.address)
        .then(account => {
          this.uniqys.balance = account.balance || 0
        })
        .catch(err => {
          this.uniqys.reject = err
        })
    }
  },
  created () {
    // eth setup
    (async () => {
      const artifact = (await axios.get('/contracts/SampleToken.json')).data
      const network = await this.web3.eth.net.getId()
      this.contract = new this.web3.eth.Contract(artifact.abi, artifact.networks[network].address)
      this.eth.address = this.account
      setInterval(() => {
        this.update()
      }, 500)
    })()
  }
}
</script>
