module.exports = {
  compilers: {
    solc: {
      version: "0.5.2"
    }
  },
  networks: {
    test: {
      host: "localhost",
      port: 6545,
      gas: 8000000,
      network_id: "*"
    },
    coverage: {
      host: "localhost",
      port: 6555,
      // https://github.com/sc-forks/solidity-coverage/blob/7e18028812849ed4f2e0e7e78558a7b18dfda0e8/lib/app.js#L16
      gas: 0xfffffffffff,
      network_id: '*',
    }
  },
};


const project = process.env.PWD.endsWith('coverageEnv') ? 'tsconfig.coverage.json' : 'tsconfig.json'

require('ts-node').register({ files: true, project })
