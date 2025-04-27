import { ethers } from "hardhat";
import { verify } from "@nomicfoundation/hardhat-verify";

async function main() {
  console.log("Deploying Luminary Nexus Token (LNX)...");
  
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  // Define constructor parameters
  const initialOwner = deployer.address; // Initial owner is deployer
  
  // Replace these addresses with actual addresses for your deployment
  const communityTreasury = process.env.TREASURY_ADDRESS || deployer.address; // Treasury address
  
  // QuickSwap router addresses
  const QUICKSWAP_ROUTER: Record<string, string> = {
    // Use appropriate router address for your network
    mumbai: "0x8954AfA98594b838bda56FE4C12a09D7739D179b", // QuickSwap router on Mumbai
    polygon: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff"  // QuickSwap router on Polygon mainnet
  };
  
  // Get the router address for the current network
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === 'unknown' ? 'hardhat' : network.name;
  const routerAddress = QUICKSWAP_ROUTER[networkName] || QUICKSWAP_ROUTER.polygon;
  
  console.log("Using router address:", routerAddress);
  console.log("Using treasury address:", communityTreasury);
  
  // Deploy the contract
  const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
  const lnxToken = await LuminaryNexusToken.deploy(
    initialOwner,
    communityTreasury,
    routerAddress
  );
  
  await lnxToken.waitForDeployment();
  const tokenAddress = await lnxToken.getAddress();
  
  console.log("LuminaryNexusToken deployed to:", tokenAddress);
  console.log("Total Supply:", ethers.formatEther(await lnxToken.totalSupply()), "LNX");
  
  // Verify contract on Etherscan/Polygonscan
  if (network.name !== 'hardhat' && network.name !== 'localhost') {
    console.log("Waiting for block confirmations...");
    // Wait for 5 block confirmations
    await ethers.provider.waitForTransaction(lnxToken.deploymentTransaction()!.hash, 5);
    
    console.log("Verifying contract on explorer...");
    try {
      await verify(tokenAddress, [
        initialOwner,
        communityTreasury,
        routerAddress
      ]);
      console.log("Contract verified successfully");
    } catch (error) {
      console.error("Error verifying contract:", error);
    }
  }
}

// Execute deployment
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});