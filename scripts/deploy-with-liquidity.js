// scripts/deploy-with-liquidity.js
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("Deploying Luminary Nexus Token (LNX)...");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`Deploying with account: ${deployer.address}`);

    // Format addresses with proper checksum
    // Using ethers.getAddress() to ensure proper checksum format
    const routerAddressRaw = "0x71E6F855A34F44139A79Ec20Dc0B0806c4cFB9D8";
    const treasuryAddressRaw = "0xcEC9aA4799805dcF676200ae8A44f04AE34bF5d4";
    
    const routerAddress = ethers.getAddress(routerAddressRaw.toLowerCase());
    const treasuryAddress = ethers.getAddress(treasuryAddressRaw.toLowerCase());
    
    console.log(`Using router address: ${routerAddress}`);
    console.log(`Using treasury address: ${treasuryAddress}`);

    // Get your contract factory
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    
    // Deploy the token with the correct constructor arguments:
    // 1. _initialOwner - The owner address (deployer in this case)
    // 2. _communityTreasury - The treasury address
    // 3. _routerAddress - The QuickSwap/Uniswap router address
    console.log("Deploying token contract...");
    const token = await LuminaryNexusToken.deploy(
      deployer.address,      // _initialOwner - The deployer account will be the initial owner
      treasuryAddress,       // _communityTreasury - Your treasury address
      routerAddress          // _routerAddress - QuickSwap V2 Router address
    );
    
    // Wait for deployment to complete
    console.log("Waiting for deployment transaction to be mined...");
    await token.deploymentTransaction().wait(1);
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
    
    // Optional: Add initial liquidity
    const addInitialLiquidity = process.env.ADD_INITIAL_LIQUIDITY === "true";
    if (addInitialLiquidity) {
      console.log("Adding initial liquidity...");
      
      // Connect to the router contract
      const router = new ethers.Contract(
        routerAddress,
        [
          "function WETH() external view returns (address)",
          "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)"
        ],
        deployer
      );
      
      // Amount of tokens to add to liquidity pool
      const tokenAmountForLiquidity = ethers.parseUnits("100000", 18); // 100,000 tokens
      
      // Amount of ETH to add to liquidity pool
      const ethAmountForLiquidity = ethers.parseEther("1.0"); // 1 ETH
      
      // Approve router to spend tokens
      console.log("Approving router to spend tokens...");
      const tokenContract = await ethers.getContractAt("LuminaryNexusToken", tokenAddress);
      await tokenContract.approve(routerAddress, tokenAmountForLiquidity);
      
      // Add liquidity
      console.log("Adding tokens and ETH to liquidity pool...");
      const deadline = Math.floor(Date.now() / 1000) + 600; // 10 minutes from now
      
      const tx = await router.addLiquidityETH(
        tokenAddress,
        tokenAmountForLiquidity,
        0, // slippage is unavoidable
        0, // slippage is unavoidable
        deployer.address,
        deadline,
        { value: ethAmountForLiquidity }
      );
      
      console.log("Waiting for liquidity transaction to be mined...");
      const receipt = await tx.wait();
      console.log(`Initial liquidity added! Transaction hash: ${receipt.hash}`);
    }
    
    console.log("Deployment completed successfully!");

    // Verify contract on block explorer if not on a local network
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log("Waiting for additional block confirmations before verification...");
      await token.deploymentTransaction().wait(5);

      console.log("Verifying contract on block explorer...");
      try {
        await hre.run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [
            deployer.address,
            treasuryAddress,
            routerAddress
          ],
        });
        console.log("Contract verified successfully");
      } catch (error) {
        console.warn("Verification failed:", error.message);
        console.log("You can try manual verification later");
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