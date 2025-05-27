// scripts/deploy-simple.js
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Deploying Luminary Nexus Token (LNX) with simplified parameters...");
    console.log(`Network: ${network.name}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);
    
    // For testing purposes, we'll use the deployer address for all parameters
    // This avoids issues with trying to find valid router addresses on testnets
    const initialOwner = deployer.address;
    const treasuryAddress = deployer.address;
    const routerAddress = deployer.address; // Using deployer address as temporary router
    
    console.log(`Using initial owner: ${initialOwner}`);
    console.log(`Using treasury address: ${treasuryAddress}`);
    console.log(`Using router address: ${routerAddress} (deployer address for testing)`);

    // Get your contract factory
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    
    console.log("Deploying token contract...");
    const token = await LuminaryNexusToken.deploy(
      initialOwner,
      treasuryAddress,
      routerAddress
    );
    
    // Wait for deployment to complete
    console.log(`Waiting for confirmation...`);
    await token.deploymentTransaction().wait(1);
    
    const tokenAddress = await token.getAddress();
    console.log(`Token deployed to: ${tokenAddress}`);
    console.log("Deployment completed successfully!");
    
    // For simplicity, we're not including verification in this script
    console.log("\nTo verify the contract manually later, run:");
    console.log(`npx hardhat verify --network ${network.name} ${tokenAddress} "${initialOwner}" "${treasuryAddress}" "${routerAddress}"`);

  } catch (error) {
    console.error("Deployment failed:", error);
    console.error("\nError details:", error.message);
    process.exit(1);
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });