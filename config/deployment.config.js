// config/deployment.config.js
/**
 * Configuration for token deployment across different networks
 * 
 * Note: All addresses will be automatically checksummed during deployment,
 * but it's good practice to store them in proper format as well.
 */

const deploymentConfig = {
    // Development networks
    hardhat: {
      tokenName: "Luminary Nexus Token",
      tokenSymbol: "LNX",
      initialSupply: "1000000", // Will be multiplied by 10^18 (for 18 decimals)
      router: "0x71E6F855A34F44139A79Ec20Dc0B0806c4cfB9D8", // Example router for local testing
      treasury: "0xcEc9aA4799805DCf676200ae8A44f04AE34bf5D4", // Example treasury for local testing
    },
    
    // Testnet - Goerli
    goerli: {
      tokenName: "Luminary Nexus Token",
      tokenSymbol: "LNX",
      initialSupply: "1000000",
      router: "0x71E6F855A34F44139A79Ec20Dc0B0806c4cfB9D8", // Replace with actual Goerli router
      treasury: "0xcEc9aA4799805DCf676200ae8A44f04AE34bf5D4", // Replace with actual Goerli treasury
    },
    
    // Testnet - Amoy
    amoy: {
      tokenName: "Luminary Nexus Token",
      tokenSymbol: "LNX",
      initialSupply: "1000000",
      router: "0x71E6F855A34F44139A79Ec20Dc0B0806c4cfB9D8", // Checksummed Amoy router address
      treasury: "0xcEc9aA4799805DCf676200ae8A44f04AE34bf5D4", // Checksummed Amoy treasury address
    },
    
    // Mainnet 
    mainnet: {
      tokenName: "Luminary Nexus Token",
      tokenSymbol: "LNX",
      initialSupply: "1000000",
      router: "0x0000000000000000000000000000000000000000", // Replace with mainnet router when ready
      treasury: "0x0000000000000000000000000000000000000000", // Replace with mainnet treasury when ready
    }
  };
  
  module.exports = deploymentConfig;