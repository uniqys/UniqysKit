var Uniqys = artifacts.require("./Uniqys.sol");
var TestUniqys = artifacts.require("./TestUniqys.sol");
var Stakable = artifacts.require("./Stakable.sol");
var Depositable = artifacts.require("./Depositable.sol");
var ValidatorSet = artifacts.require("./ValidatorSet.sol");
var TestValidatorSet = artifacts.require("./TestValidatorSet.sol");

async function deploy(deployer) {
  await deployer.deploy(Uniqys);
  await deployer.link(Uniqys, TestUniqys);
  await deployer.deploy(TestUniqys)

  await deployer.link(Uniqys, ValidatorSet);
  await deployer.deploy(ValidatorSet);
  await deployer.link(Uniqys, TestValidatorSet);
  await deployer.deploy(TestValidatorSet);

  await deployer.link(Uniqys, Stakable);
  await deployer.deploy(Stakable);

  await deployer.link(Uniqys, Depositable);
  await deployer.deploy(Depositable, "0x0");
};

module.exports = function(deployer, network) {
  deployer.then(() => deploy(deployer, network));
};
