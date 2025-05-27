// scripts/deploy-with-mock.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Deploying Luminary Nexus Token (LNX)...");
    console.log(`Network: ${network.name}`);
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Check if we have a mock router deployed
    let routerAddress;
    const deploymentsDir = path.join(__dirname, "../deployments");
    const mockRouterFilePath = path.join(deploymentsDir, `${network.name}-mock-router.json`);
    
    if (fs.existsSync(mockRouterFilePath)) {
      const mockRouterInfo = JSON.parse(fs.readFileSync(mockRouterFilePath, 'utf8'));
      routerAddress = mockRouterInfo.mockRouterAddress;
      console.log(`Using previously deployed mock router at: ${routerAddress}`);
    } else {
      console.log("No mock router found. Will use deployer address as router.");
      routerAddress = deployer.address;
    }
    
    // Get treasury address from .env or use deployer as fallback
    const treasuryAddressRaw = process.env.TREASURY_ADDRESS || deployer.address;
    const treasuryAddress = ethers.getAddress(treasuryAddressRaw.toLowerCase());
    
    // Ensure all addresses have proper checksum
    const initialOwner = deployer.address; // Already checksummed
    routerAddress = ethers.getAddress(routerAddress.toLowerCase());
    
    console.log(`Using initial owner: ${initialOwner}`);
    console.log(`Using treasury address: ${treasuryAddress}`);
    console.log(`Using router address: ${routerAddress}`);

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
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      tokenAddress: tokenAddress,
      routerAddress: routerAddress,
      treasuryAddress: treasuryAddress,
      initialOwner: initialOwner,
      deployer: deployer.address,
      deploymentTxHash: token.deploymentTransaction().hash,
      timestamp: new Date().toISOString(),
    };

    // Ensure deployments directory exists
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
      
      try {
        await token.deploymentTransaction().wait(5);
        console.log(`Ready to verify contract at address: ${tokenAddress}`);
        
        console.log("Verifying contract on block explorer...");
        await hre.run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [
            initialOwner,
            treasuryAddress,
            routerAddress
          ],
        });
        console.log("Contract verified successfully!");
      } catch (verificationError) {
        console.warn("Verification failed:", verificationError.message);
        console.log(`
To verify manually later, run:
npx hardhat verify --network ${network.name} ${tokenAddress} "${initialOwner}" "${treasuryAddress}" "${routerAddress}"
        `);
      }
    }

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