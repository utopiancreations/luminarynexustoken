// scripts/deploy-mock-router.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Deploying Mock Uniswap V2 Router...");
    console.log(`Network: ${network.name}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Deploy the mock router
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
    const mockRouter = await MockRouter.deploy();
    
    // Wait for deployment
    console.log("Waiting for confirmation...");
    await mockRouter.deploymentTransaction().wait(1);
    
    const mockRouterAddress = await mockRouter.getAddress();
    console.log(`Mock router deployed to: ${mockRouterAddress}`);
    
    // Save router info
    const routerInfo = {
      network: network.name,
      mockRouterAddress: mockRouterAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
    };

    // Ensure deployments directory exists
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save router info to file
    const routerFilePath = path.join(deploymentsDir, `${network.name}-mock-router.json`);
    fs.writeFileSync(
      routerFilePath,
      JSON.stringify(routerInfo, null, 2)
    );

    console.log(`Mock router information saved to ${routerFilePath}`);
    console.log(`\nYou can now deploy your token using this router address: ${mockRouterAddress}`);
    console.log(`\nRun: npx hardhat run scripts/deploy.js --network ${network.name}`);
    
    // Verify router on block explorer if not on a local network
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("\nVerifying mock router on block explorer...");
      try {
        await hre.run("verify:verify", {
          address: mockRouterAddress,
          constructorArguments: []
        });
        console.log("Mock router verified successfully!");
      } catch (verificationError) {
        console.warn("Mock router verification failed:", verificationError.message);
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