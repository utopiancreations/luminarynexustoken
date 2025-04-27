require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  paths: {
    tests: "./test-js"
  }
};