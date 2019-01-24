const path = require('path')

module.exports = {
  contracts_build_directory: path.join(__dirname, "../static/contracts"),
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*"
    }
  }
}
