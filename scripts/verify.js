// scripts/verify.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    const networkName = network.name;
    console.log(`Verifying contract on ${networkName}...`);
    
    // Check if deployment info exists
    const deploymentsDir = path.join(__dirname, "../deployments");
    const deploymentFilePath = path.join(deploymentsDir, `${networkName}-deployment.json`);
    
    let tokenAddress, deployer, treasuryAddress, routerAddress;
    
    if (fs.existsSync(deploymentFilePath)) {
      // Read from deployment file
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
      tokenAddress = deploymentInfo.tokenAddress;
      deployer = deploymentInfo.deployer;
      treasuryAddress = deploymentInfo.treasuryAddress;
      routerAddress = deploymentInfo.routerAddress;
      
      console.log(`Found deployment info for ${networkName}`);
      console.log(`Token address: ${tokenAddress}`);
    } else {
      // Manual input if no deployment file
      if (!process.env.TOKEN_ADDRESS) {
        throw new Error(`No deployment file found at ${deploymentFilePath} and no TOKEN_ADDRESS in .env`);
      }
      
      tokenAddress = process.env.TOKEN_ADDRESS;
      deployer = process.env.DEPLOYER_ADDRESS || (await ethers.getSigners())[0].address;
      treasuryAddress = process.env.TREASURY_ADDRESS || deployer;
      
      // Set router address based on network
      if (networkName === "amoy") {
        routerAddress = "0x71E6F855A34F44139A79Ec20Dc0B0806c4cFB9D8";
      } else if (networkName === "polygon") {
        routerAddress = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
      } else {
        routerAddress = process.env.ROUTER_ADDRESS || deployer;
      }
      
      // Ensure proper checksum format
      tokenAddress = ethers.getAddress(tokenAddress.toLowerCase());
      deployer = ethers.getAddress(deployer.toLowerCase());
      treasuryAddress = ethers.getAddress(treasuryAddress.toLowerCase());
      routerAddress = ethers.getAddress(routerAddress.toLowerCase());
      
      console.log(`Using manual verification parameters:`);
      console.log(`Token address: ${tokenAddress}`);
    }
    
    console.log(`Verifying with constructor arguments:`);
    console.log(`1. Initial Owner: ${deployer}`);
    console.log(`2. Treasury: ${treasuryAddress}`);
    console.log(`3. Router: ${routerAddress}`);
    
    // Verify the contract
    await hre.run("verify:verify", {
      address: tokenAddress,
      constructorArguments: [
        deployer,
        treasuryAddress,
        routerAddress
      ],
    });
    
    console.log("Contract verified successfully!");
    
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

// Execute verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });