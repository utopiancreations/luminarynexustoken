// scripts/deploy-basic.js
const { ethers } = require("hardhat");
const { getAddress } = ethers;

async function main() {
  try {
    console.log("Deploying Luminary Nexus Token (LNX)...");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Format addresses with proper checksum
    // Convert to lowercase first to handle any case variations, then get proper checksum
    const routerAddressRaw = "0x71E6F855A34F44139A79Ec20Dc0B0806c4cFB9D8";
    const treasuryAddressRaw = "0xcEC9aA4799805dcF676200ae8A44f04AE34bF5d4";
    
    const routerAddress = getAddress(routerAddressRaw.toLowerCase());
    const treasuryAddress = getAddress(treasuryAddressRaw.toLowerCase());
    
    console.log(`Using router address: ${routerAddress}`);
    console.log(`Using treasury address: ${treasuryAddress}`);

    // Get your contract factory
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    
    // ================================================================
    // IMPORTANT: Adjust these constructor arguments to match your contract's requirements
    // Look at your contract's constructor to determine what parameters it needs
    // ================================================================
    
    // Option 1: If your token doesn't require initial parameters (unlikely for an ERC20)
    // const token = await LuminaryNexusToken.deploy();
    
    // Option 2: For a standard ERC20 with just name and symbol
    // const token = await LuminaryNexusToken.deploy("Luminary Nexus Token", "LNX");
    
    // Option 3: For a standard ERC20 with initial supply
    // const initialSupply = ethers.parseUnits("1000000", 18); // 1 million tokens with 18 decimals
    // const token = await LuminaryNexusToken.deploy("Luminary Nexus Token", "LNX", initialSupply);
    
    // Option 4: For your specific token with router and treasury addresses
    const initialSupply = ethers.parseUnits("1000000", 18); // 1 million tokens with 18 decimals
    const token = await LuminaryNexusToken.deploy(
      "Luminary Nexus Token", 
      "LNX", 
      initialSupply,
      routerAddress,
      treasuryAddress
    );
    
    // Uncomment one of the options above based on your contract's requirements
    
    // Wait for deployment to complete
    await token.deploymentTransaction().wait(1);
    const tokenAddress = await token.getAddress();
    
    console.log(`Token deployed to: ${tokenAddress}`);
    console.log("Deployment completed successfully!");

  } catch (error) {
    console.error("Deployment failed:", error);
    console.error(error.stack); // Print stack trace for more details
    
    // Check if this is a constructor argument error
    if (error.message.includes("incorrect number of arguments")) {
      console.log("\n=== TROUBLESHOOTING ===");
      console.log("This error suggests that the number of arguments in your deployment script");
      console.log("doesn't match the number expected by your contract's constructor.");
      console.log("\nPossible fixes:");
      console.log("1. Run the 'inspect-contract.js' script to check your contract's constructor");
      console.log("2. Edit this script to match the exact parameters your constructor expects");
      console.log("3. Check your contract's solidity code to verify the constructor parameters");
    }
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });