// scripts/deploy.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Deploying Luminary Nexus Token (LNX)...");
    console.log(`Network: ${network.name}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Get treasury address from .env or use deployer as fallback
    const treasuryAddressRaw = process.env.TREASURY_ADDRESS || deployer.address;
    
    // For QuickSwap Router on Polygon networks
    let routerAddressRaw;
    
    if (network.name === "amoy") {
      // QuickSwap router on Amoy (adjust if needed)
      routerAddressRaw = "0x71E6F855A34F44139A79Ec20Dc0B0806c4cFB9D8";
    } else if (network.name === "polygon") {
      // QuickSwap router on Polygon mainnet
      routerAddressRaw = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
    } else {
      // Local testing - use deployer address
      routerAddressRaw = deployer.address;
    }
    
    // Format addresses with proper checksum
    // IMPORTANT: Lowercase first, then get proper checksum
    const routerAddress = ethers.getAddress(routerAddressRaw.toLowerCase());
    const treasuryAddress = ethers.getAddress(treasuryAddressRaw.toLowerCase());
    
    console.log(`Using router address: ${routerAddress}`);
    console.log(`Using treasury address: ${treasuryAddress}`);

    // Get your contract factory
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    
    console.log("Deploying token contract...");
    const token = await LuminaryNexusToken.deploy(
      deployer.address,  // _initialOwner
      treasuryAddress,   // _communityTreasury
      routerAddress      // _routerAddress
    );
    
    // Wait for deployment to complete (more confirmations for testnet/mainnet)
    const confirmations = network.name === "hardhat" ? 1 : 2;
    console.log(`Waiting for ${confirmations} confirmations...`);
    await token.deploymentTransaction().wait(confirmations);
    
    const tokenAddress = await token.getAddress();
    console.log(`Token deployed to: ${tokenAddress}`);
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      tokenAddress: tokenAddress,
      routerAddress: routerAddress,
      treasuryAddress: treasuryAddress,
      deployer: deployer.address,
      deploymentTxHash: token.deploymentTransaction().hash,
      timestamp: new Date().toISOString(),
    };

    // Ensure deployments directory exists
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment info to file
    const deploymentFilePath = path.join(deploymentsDir, `${network.name}-deployment.json`);
    fs.writeFileSync(
      deploymentFilePath,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log(`Deployment information saved to ${deploymentFilePath}`);
    console.log("Deployment completed successfully!");

    // Verify contract on block explorer if not on a local network
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log(`Waiting for more confirmations before verification...`);
      // Wait for more confirmations before verifying
      try {
        await token.deploymentTransaction().wait(5);
        console.log(`Ready to verify contract at address: ${tokenAddress}`);
        
        console.log("Verifying contract on block explorer...");
        // Using @nomicfoundation/hardhat-verify
        await hre.run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [
            deployer.address,
            treasuryAddress,
            routerAddress
          ],
        });
        console.log("Contract verified successfully!");
      } catch (verificationError) {
        console.warn("Verification failed:", verificationError.message);
        console.log(`
To verify manually later, run:
npx hardhat verify --network ${network.name} ${tokenAddress} "${deployer.address}" "${treasuryAddress}" "${routerAddress}"
        `);
      }
    }

  } catch (error) {
    console.error("Deployment failed:", error);
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