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
  <div id="app">
    <Manager v-if="web3" :easy="easy" :web3="web3" :account="account"/>
  </div>
</template>

<script>
import Manager from './Manager.vue'
const Web3 = require('web3')

export default {
  components: {
    Manager
  },
  data () {
    return {
      easy: null,
      web3: null,
      account: ''
    }
  },
  async created () {
    if (Web3.givenProvider) {
      console.log('Web3 injected browser: OK.')
      this.web3 = new Web3(Web3.givenProvider)
      this.easy = new Easy.Web3(Web3.givenProvider, location.origin)
    } else {
      alert('Web3 is not injected')
      return
    }
    web3.eth.getAccounts((err, accounts) => {
      if (accounts.length === 0) {
        alert('please unlock wallet')
        let initInterval = setInterval(async () => {
          if (!this.web3) return
          const accounts = this.web3.eth.getAccounts((err, accounts) => {
            if (accounts.length === 0) return
            this.account = accounts[0]
            clearInterval(initInterval)
          })
        }, 500)
      } else {
        this.account = accounts[0]
      }
    })
  }
}
</script>
