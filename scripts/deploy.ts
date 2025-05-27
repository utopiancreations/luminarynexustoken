// Deployment script for Luminary Nexus Token (LNX)
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Import contract artifacts
const LuminaryNexusToken = require("../artifacts/contracts/LuminaryNexusToken.sol/LuminaryNexusToken.json");

async function main() {
  try {
    console.log("Deploying Luminary Nexus Token (LNX)...");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Define addresses and convert to proper checksum format
    // This is the critical fix - always format addresses through ethers.getAddress()
    const routerAddress = ethers.getAddress("0x71E6F855A34F44139A79Ec20Dc0B0806c4cFB9D8".toLowerCase());
    const treasuryAddress = ethers.getAddress("0xcEC9aA4799805dcF676200ae8A44f04AE34bF5d4".toLowerCase());
    
    // Log addresses with proper checksum
    console.log(`Using router address: ${routerAddress}`);
    console.log(`Using treasury address: ${treasuryAddress}`);

    // Deploy the token contract
    const tokenFactory = new ethers.ContractFactory(
      LuminaryNexusToken.abi,
      LuminaryNexusToken.bytecode,
      deployer
    );

    // Constructor parameters - adjust these according to your contract
    const name = "Luminary Nexus Token";
    const symbol = "LNX";
    const initialSupply = ethers.parseUnits("1000000", 18); // 1 million tokens with 18 decimals
    
    const token = await tokenFactory.deploy(
      name,
      symbol,
      initialSupply,
      routerAddress,
      treasuryAddress
    );

    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    console.log(`Token deployed to: ${tokenAddress}`);

    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      tokenAddress: tokenAddress,
      routerAddress: routerAddress,
      treasuryAddress: treasuryAddress,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
    };

    // Ensure deployments directory exists
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    // Save deployment info to file
    fs.writeFileSync(
      path.join(deploymentsDir, `${network.name}-deployment.json`),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("Deployment information saved to deployments directory");
    console.log("Deployment completed successfully!");

    // Verify contract on Etherscan if not on a local network
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("Waiting for block confirmations before verification...");
      await token.deploymentTransaction().wait(5); // Wait for 5 confirmations

      console.log("Verifying contract on Etherscan...");
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: [
          name,
          symbol,
          initialSupply,
          routerAddress,
          treasuryAddress
        ],
      });
      console.log("Contract verified on Etherscan");
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