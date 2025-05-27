// scripts/check-router.js
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Checking router address on network:", network.name);
    
    // Get account
    const [account] = await ethers.getSigners();
    console.log(`Using account: ${account.address}`);

    // Router address to check
    const routerAddressRaw = "0x71E6F855A34F44139A79Ec20Dc0B0806c4cFB9D8";
    const routerAddress = ethers.getAddress(routerAddressRaw.toLowerCase());
    console.log(`Checking router address: ${routerAddress}`);
    
    // Check if the address has code (is a contract)
    const code = await ethers.provider.getCode(routerAddress);
    if (code === "0x") {
      console.log("❌ ERROR: The router address does not contain any code. It's not a contract or doesn't exist on this network.");
      
      // Suggest using a temporary address for testing
      console.log("\nFor testing purposes, you can temporarily modify your contract to accept non-contract addresses:");
      console.log("1. Comment out the router address validation in your constructor");
      console.log("2. Create a minimal mock of the router interface");
      console.log("\nAlternatively, find the correct router address for the Amoy testnet.");
      return;
    }
    
    console.log("✅ Router address contains code. It's a contract.");
    
    // Try to get router's factory and WETH methods
    try {
      // Create interface with router methods
      const routerInterface = new ethers.Interface([
        "function factory() external view returns (address)",
        "function WETH() external view returns (address)"
      ]);
      
      // Create contract instance
      const router = new ethers.Contract(routerAddress, routerInterface, account);
      
      // Try to call WETH() function
      const wethAddress = await router.WETH();
      console.log(`WETH address from router: ${wethAddress}`);
      
      // Try to call factory() function
      const factoryAddress = await router.factory();
      console.log(`Factory address from router: ${factoryAddress}`);
      
      console.log("✅ Successfully called router functions. This appears to be a valid router.");
    } catch (error) {
      console.log("❌ ERROR: Failed to call router functions:", error.message);
      console.log("\nThis suggests the address is not a Uniswap/QuickSwap compatible router or doesn't exist on this network.");
      
      // Suggest using a temporary mock
      console.log("\nFor testing on Amoy, you might need to:");
      console.log("1. Deploy your own mock router contract first");
      console.log("2. Use that address for your token deployment");
      console.log("3. Or find the correct QuickSwap router address for Amoy testnet");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

// Execute script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });