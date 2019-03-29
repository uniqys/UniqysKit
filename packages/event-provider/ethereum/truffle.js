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
    }
  }
};
require('ts-node').register({ files: true })
