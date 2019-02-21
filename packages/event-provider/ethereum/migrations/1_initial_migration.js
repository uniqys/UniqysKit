var Migrations = artifacts.require("./Migrations.sol");

async function deploy(deployer, network) {
  await deployer.deploy(Migrations);
};

module.exports = function(deployer, network) {
  deployer.then(() => deploy(deployer, network));
};
