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
        <div class="navbar-brand">Uniqys Ethereum Side Chain</div>
        <div class="navbar-text">
          A sample of Ethereum Side Chain.
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
              <p>
                <h5 class="card-title">Withdraw</h5>
                <div class="input-group mt-3">
                  <input type="text" id="eth-withdraw-value" class="form-control" placeholder="Value" v-model="eth.withdraw.value">
                  <div class="input-group-append">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      id="eth-withdraw-submit"
                      @click.prevent="ethWithdraw"
                    >Submit</button>
                  </div>
                </div>
              </p>
              <p>
                <h5 class="card-title">StakeDeposit</h5>
                <div class="input-group mt-3">
                  <input type="text" id="eth-stake-deposit-value" class="form-control" placeholder="Value" v-model="eth.stakeDeposit.value">
                  <div class="input-group-append">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      id="eth-stake-deposit-submit"
                      @click.prevent="ethStakeDeposit"
                    >Submit</button>
                  </div>
                </div>
              </p>
              <p>
                <h5 class="card-title">StakeWithdraw</h5>
                <div class="input-group mt-3">
                  <input type="text" id="eth-stake-withdraw-value" class="form-control" placeholder="Value" v-model="eth.stakeWithdraw.value">
                  <div class="input-group-append">
                    <button
                      class="btn btn-outline-secondary"
                      type="button"
                      id="eth-stake-withdraw-submit"
                      @click.prevent="ethStakeWithdraw"
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

export default {
  props: ['easy', 'web3', 'account'],
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
        withdraw: {
          value: null,
          withdrawable: []
        },
        stakeDeposit: {
          value: null
        },
        stakeWithdraw: {
          value: null
        },
        resolve: null,
        reject: null
      },
      uniqys: {
        balance: 0,
        address: null,
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
      this.easy.post('/transfer', { to: this.uniqys.transfer.to, value: this.uniqys.transfer.value }, { sign: true })
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
        if (err) { this.eth.reject = err }
        if (txHash) { this.eth.resolve = true }
      })
    },
    async fetchLatestWithdrawableTxInfo () {
      const txInfoList = (await this.easy.get(`/withdrawable/${this.uniqys.address}`)).data
      return txInfoList[txInfoList.length - 1]
    },
    async ethWithdraw () {
      this.eth.resolve = null
      this.eth.reject = null
      if (!this.eth.withdraw.value) {
        this.eth.reject = 'invalid input'
        return
      }
      // uniqys
      await this.easy.post('/withdraw', this.eth.withdraw.value, { sign: true, headers: {'Content-Type': 'text/plain'} })
        .catch((err) => this.eth.reject = `Error at Uniqys: ${err.toString()}`)

      // eth
      const txInfo = await this.fetchLatestWithdrawableTxInfo()
      const tx = await this.easy.api.transaction(txInfo.txHash)
      const proof = await this.easy.api.merkleProof(txInfo.txHash)
      const block = await this.easy.api.block(txInfo.height)
      this.contract.methods.withdraw(
        `0x${tx}`,
        proof.map(p => `0x${p}`),
        [ block.header.height,
          block.header.timestamp,
          `0x${block.header.lastBlockHash}`,
          `0x${block.header.transactionRoot}`,
          `0x${block.header.lastBlockConsensusRoot}`,
          `0x${block.header.nextValidatorSetRoot}`,
          `0x${block.header.appStateHash}` ],
        block.body.consensus.round,
        block.body.consensus.signatures.map(s => `0x${s}`)
      ).send({
        from: this.eth.address
      }), (err, txHash) => {
        if (err) { this.eth.reject = err }
        if (txHash) { this.eth.resolve = true }
      }
    },
    ethStakeDeposit () {
      this.eth.resolve = null
      this.eth.reject = null
      if (!this.eth.stakeDeposit.value) { // 0, null, undefined
        this.eth.reject = 'invalid input'
        return
      }
      this.contract.methods.stakeDeposit(this.eth.stakeDeposit.value).send({
        from: this.eth.address
      }, (err, txHash) => {
        if (err) { this.eth.reject = err }
        if (txHash) { this.eth.resolve = true }
      })
    },
    ethStakeWithdraw () {
      this.eth.resolve = null
      this.eth.reject = null
      if (!this.eth.stakeWithdraw.value) { // 0, null, undefined
        this.eth.reject = 'invalid input'
        return
      }
      this.contract.methods.stakeWithdraw(this.eth.stakeWithdraw.value).send({
        from: this.eth.address
      }, (err, txHash) => {
        if (err) { this.eth.reject = err }
        if (txHash) { this.eth.resolve = true }
      })
    },
    update () {
      // eth update
      this.contract.methods.balanceOf(this.eth.address).call({ from: this.eth.address })
        .then(res => { this.eth.balance = parseInt(res) || 0 })
        .catch(err => { this.eth.reject = err.toString() })
      // uniqys udpate
      this.uniqys.address = this.easy.address.toString()
      this.easy.api.account(this.uniqys.address)
        .then(account => { this.uniqys.balance = account.balance || 0 })
        .catch(err => { this.uniqys.reject = err })
    }
  },
  created () {
    // setup
    (async () => {
      const artifact = (await axios.get('/contracts/SampleToken.json')).data
      const network = await this.web3.eth.net.getId()
      this.contract = new this.web3.eth.Contract(artifact.abi, artifact.networks[network].address)
      this.eth.address = this.account
      setInterval(this.update, 1000)
      this.update()
    })()
  }
}
</script>
