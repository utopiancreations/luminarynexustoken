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

    // --- Deploy LuminaryNexusDistribution contract ---
    console.log("\nDeploying Luminary Nexus Distribution contract...");
    const LuminaryNexusDistribution = await ethers.getContractFactory("LuminaryNexusDistribution");

    // For the airdrop mechanism, we can use a placeholder or a dedicated airdrop contract address.
    // For now, let's use the deployer address as a placeholder for the airdrop mechanism.
    // In a real scenario, this would be a more sophisticated contract or a multi-sig.
    const airdropMechanismAddress = deployer.address; 
    const founderAddress = deployer.address; // Assuming deployer is also the founder for initial setup

    const distribution = await LuminaryNexusDistribution.deploy(
      tokenAddress,             // _lnxTokenAddress
      treasuryAddress,          // _daoTreasury
      founderAddress,           // _founder
      airdropMechanismAddress,  // _airdropMechanism
      deployer.address          // _initialDistributionOwner (owner of this contract)
    );

    await distribution.deploymentTransaction().wait(confirmations);
    const distributionAddress = await distribution.getAddress();
    console.log(`Distribution contract deployed to: ${distributionAddress}`);

    // Exclude the distribution contract from fees in the LNX token contract
    console.log("Excluding distribution contract from LNX token fees...");
    await token.excludeFromFee(distributionAddress, true);
    console.log("Distribution contract excluded from LNX token fees.");

    // --- Transfer initial supply to Distribution contract ---
    console.log("\nTransferring initial LNX supply to Distribution contract...");
    const initialSupply = await token.INITIAL_SUPPLY();
    const transferTx = await token.transfer(distributionAddress, initialSupply);
    await transferTx.wait();
    console.log(`Transferred ${ethers.formatEther(initialSupply)} LNX to Distribution contract.`);

    // --- Execute initial distribution ---
    console.log("\nExecuting initial distribution...");
    const executeTx = await distribution.executeInitialDistribution();
    await executeTx.wait();
    console.log("Initial distribution executed successfully!");

    // --- Deploy LuminaryNexusTimelock contract ---
    console.log("\nDeploying Luminary Nexus Timelock contract...");
    const LuminaryNexusTimelock = await ethers.getContractFactory("LuminaryNexusTimelock");
    const timelock = await LuminaryNexusTimelock.deploy(
      deployer.address, // proposer (initially deployer, will be governor)
      deployer.address, // executor (initially deployer, will be governor)
      deployer.address  // admin (initially deployer, will be revoked)
    );
    await timelock.deploymentTransaction().wait(confirmations);
    const timelockAddress = await timelock.getAddress();
    console.log(`Timelock deployed to: ${timelockAddress}`);

    // --- Deploy LuminaryNexusGovernor contract ---
    console.log("\nDeploying Luminary Nexus Governor contract...");
    const LuminaryNexusGovernor = await ethers.getContractFactory("LuminaryNexusGovernor");
    const governor = await LuminaryNexusGovernor.deploy(
      tokenAddress,    // _lnxTokenAddress
      timelockAddress  // _timelockAddress
    );
    await governor.deploymentTransaction().wait(confirmations);
    const governorAddress = await governor.getAddress();
    console.log(`Governor deployed to: ${governorAddress}`);

    // --- Configure DAO roles and ownership ---
    console.log("\nConfiguring DAO roles and ownership...");

    // Transfer ownership of LNX Token to the Governor contract
    console.log("Transferring LNX Token ownership to Governor...");
    await token.transferOwnership(governorAddress);
    console.log("LNX Token ownership transferred.");

    // Grant PROPOSER_ROLE and EXECUTOR_ROLE to the Governor on the Timelock
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    console.log("Granting PROPOSER_ROLE to Governor on Timelock...");
    await timelock.grantRole(PROPOSER_ROLE, governorAddress);
    console.log("Granting EXECUTOR_ROLE to Governor on Timelock...");
    await timelock.grantRole(EXECUTOR_ROLE, governorAddress);

    // Revoke deployer's ADMIN_ROLE on the Timelock
    console.log("Revoking deployer's ADMIN_ROLE on Timelock...");
    await timelock.revokeRole(ADMIN_ROLE, deployer.address);
    console.log("Deployer's ADMIN_ROLE revoked.");

    console.log("DAO configuration complete.");
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      tokenAddress: tokenAddress,
      distributionAddress: distributionAddress,
      timelockAddress: timelockAddress,
      governorAddress: governorAddress,
      routerAddress: routerAddress,
      treasuryAddress: treasuryAddress,
      deployer: deployer.address,
      deploymentTxHash: token.deploymentTransaction().hash,
      distributionTxHash: distribution.deploymentTransaction().hash,
      initialTransferTxHash: transferTx.hash,
      initialDistributionExecuteTxHash: executeTx.hash,
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

    // Verify contracts on block explorer if not on a local network
    if (network.name !== "localhost" && network.name !== "hardhat") {
      console.log(`Waiting for more confirmations before verification...`);
      // Wait for more confirmations before verifying
      try {
        await token.deploymentTransaction().wait(5);
        console.log(`Ready to verify token contract at address: ${tokenAddress}`);
        
        console.log("Verifying token contract on block explorer...");
        await hre.run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [
            deployer.address,
            treasuryAddress,
            routerAddress
          ],
        });
        console.log("Token contract verified successfully!");

        await distribution.deploymentTransaction().wait(5);
        console.log(`Ready to verify distribution contract at address: ${distributionAddress}`);

        console.log("Verifying distribution contract on block explorer...");
        await hre.run("verify:verify", {
          address: distributionAddress,
          constructorArguments: [
            tokenAddress,
            treasuryAddress,
            founderAddress,
            airdropMechanismAddress,
            deployer.address
          ],
        });
        console.log("Distribution contract verified successfully!");

        await timelock.deploymentTransaction().wait(5);
        console.log(`Ready to verify timelock contract at address: ${timelockAddress}`);

        console.log("Verifying timelock contract on block explorer...");
        await hre.run("verify:verify", {
          address: timelockAddress,
          constructorArguments: [
            deployer.address,
            deployer.address,
            deployer.address
          ],
        });
        console.log("Timelock contract verified successfully!");

        await governor.deploymentTransaction().wait(5);
        console.log(`Ready to verify governor contract at address: ${governorAddress}`);

        console.log("Verifying governor contract on block explorer...");
        await hre.run("verify:verify", {
          address: governorAddress,
          constructorArguments: [
            tokenAddress,
            timelockAddress
          ],
        });
        console.log("Governor contract verified successfully!");

      } catch (verificationError) {
        console.warn("Verification failed:", verificationError.message);
        console.log(`
To verify LuminaryNexusToken manually later, run:
npx hardhat verify --network ${network.name} ${tokenAddress} "${deployer.address}" "${treasuryAddress}" "${routerAddress}"

To verify LuminaryNexusDistribution manually later, run:
npx hardhat verify --network ${network.name} ${distributionAddress} "${tokenAddress}" "${treasuryAddress}" "${founderAddress}" "${airdropMechanismAddress}" "${deployer.address}"

To verify LuminaryNexusTimelock manually later, run:
npx hardhat verify --network ${network.name} ${timelockAddress} "${deployer.address}" "${deployer.address}" "${deployer.address}"

To verify LuminaryNexusGovernor manually later, run:
npx hardhat verify --network ${network.name} ${governorAddress} "${tokenAddress}" "${timelockAddress}"
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