const path = require('path')

module.exports = {
  contracts_build_directory: path.join(__dirname, "../static/contracts"),
  compilers: {
    solc: {
      version: "0.5.2"
    }
  },
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*"
    }
  }
}
