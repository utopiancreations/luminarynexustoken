// scripts/deploy.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// 🏛️ LUMINARY NEXUS DAO - OFFICIAL WALLET ADDRESSES
// These are the five public wallet addresses for our DAO operations
const DAO_WALLETS = {
  ADMIN: "0x77bc51eb24056dcf949c36c09025fdfbaf69e53b",           // Admin Account 1
  TREASURY: "0xf4f245afa81bcc72c986346ce8d949ea1eb4f0ae",        // Treasury Account 2  
  AIRDROP_LIQUIDITY: "0x860c1b6a8bedc2d3b766d5da7830fbab815c4911", // Airdrop & Liquidity Account 3
  TEST_ACCOUNT_4: "0x9dc599dcb37af9b96d96b87c97ee89f98c890185",    // Test Account 4
  TEST_ACCOUNT_5: "0x9dc599dcb37af9b96d96b87c97ee89f98c890185"     // Test Account 5
};

async function main() {
  try {
    console.log("🚀 Deploying Luminary Nexus Token (LNX)...");
    console.log(`📡 Network: ${network.name}`);
    console.log("🏛️ Using official DAO wallet addresses");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log(`👤 Deploying with account: ${deployer.address}`);

    // Use official treasury address
    const treasuryAddressRaw = DAO_WALLETS.TREASURY;
    
    // For QuickSwap Router on Polygon networks
    let routerAddressRaw;
    
    if (network.name === "amoy") {
      // QuickSwap router on Amoy testnet
      routerAddressRaw = "0x71E6F855A34F44139A79Ec20Dc0B0806c4cFB9D8";
    } else if (network.name === "polygon") {
      // QuickSwap router on Polygon mainnet
      routerAddressRaw = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
    } else {
      // Local testing - use deployer address
      routerAddressRaw = deployer.address;
    }
    
    // Format addresses with proper checksum
    const routerAddress = ethers.getAddress(routerAddressRaw.toLowerCase());
    const treasuryAddress = ethers.getAddress(treasuryAddressRaw.toLowerCase());
    
    console.log(`🔗 Using router address: ${routerAddress}`);
    console.log(`💰 Using treasury address: ${treasuryAddress}`);

    // Get your contract factory
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    
    console.log("📋 Deploying token contract...");
    const token = await LuminaryNexusToken.deploy(
      deployer.address,  // _initialOwner
      treasuryAddress,   // _communityTreasury
      routerAddress      // _routerAddress
    );
    
    // Wait for deployment to complete (more confirmations for testnet/mainnet)
    const confirmations = network.name === "hardhat" ? 1 : 2;
    console.log(`⏳ Waiting for ${confirmations} confirmations...`);
    await token.deploymentTransaction().wait(confirmations);
    
    const tokenAddress = await token.getAddress();
    console.log(`✅ Token deployed to: ${tokenAddress}`);

    // --- Deploy LuminaryNexusDistribution contract ---
    console.log("\n📦 Deploying Luminary Nexus Distribution contract...");
    const LuminaryNexusDistribution = await ethers.getContractFactory("LuminaryNexusDistribution");

    // Use official DAO wallets for distribution
    const airdropMechanismAddress = DAO_WALLETS.AIRDROP_LIQUIDITY; 
    const founderAddress = DAO_WALLETS.ADMIN; // Admin account manages founder allocation

    const distribution = await LuminaryNexusDistribution.deploy(
      tokenAddress,             // _lnxTokenAddress
      treasuryAddress,          // _daoTreasury
      founderAddress,           // _founder
      airdropMechanismAddress,  // _airdropMechanism
      deployer.address          // _initialDistributionOwner (owner of this contract)
    );

    await distribution.deploymentTransaction().wait(confirmations);
    const distributionAddress = await distribution.getAddress();
    console.log(`✅ Distribution contract deployed to: ${distributionAddress}`);

    // Exclude the distribution contract from fees in the LNX token contract
    console.log("🔧 Excluding distribution contract from LNX token fees...");
    await token.excludeFromFee(distributionAddress, true);
    console.log("✅ Distribution contract excluded from LNX token fees.");

    // --- Transfer initial supply to Distribution contract ---
    console.log("\n💸 Transferring initial LNX supply to Distribution contract...");
    const initialSupply = await token.INITIAL_SUPPLY();
    const transferTx = await token.transfer(distributionAddress, initialSupply);
    await transferTx.wait();
    console.log(`✅ Transferred ${ethers.formatEther(initialSupply)} LNX to Distribution contract.`);

    // --- Execute initial distribution ---
    console.log("\n🎯 Executing initial distribution...");
    const executeTx = await distribution.executeInitialDistribution();
    await executeTx.wait();
    console.log("✅ Initial distribution executed successfully!");

    // --- Deploy LuminaryNexusTimelock contract ---
    console.log("\n⏰ Deploying Luminary Nexus Timelock contract...");
    const LuminaryNexusTimelock = await ethers.getContractFactory("LuminaryNexusTimelock");
    const timelock = await LuminaryNexusTimelock.deploy(
      deployer.address, // proposer (initially deployer, will be governor)
      deployer.address, // executor (initially deployer, will be governor)
      deployer.address  // admin (initially deployer, will be revoked)
    );
    await timelock.deploymentTransaction().wait(confirmations);
    const timelockAddress = await timelock.getAddress();
    console.log(`✅ Timelock deployed to: ${timelockAddress}`);

    // --- Deploy LuminaryNexusGovernorV2 contract ---
    console.log("\n🏛️ Deploying Luminary Nexus GovernorV2 contract...");
    const LuminaryNexusGovernorV2 = await ethers.getContractFactory("LuminaryNexusGovernorV2");
    
    // Deploy Reputation contract first for GovernorV2
    console.log("📊 Deploying Reputation contract for governance...");
    const Reputation = await ethers.getContractFactory("Reputation");
    const reputation = await Reputation.deploy();
    await reputation.deploymentTransaction().wait(confirmations);
    const reputationAddress = await reputation.getAddress();
    console.log(`✅ Reputation deployed to: ${reputationAddress}`);
    
    const governor = await LuminaryNexusGovernorV2.deploy(
      tokenAddress,     // _lnxTokenAddress
      timelockAddress,  // _timelockAddress
      reputationAddress // _reputationAddress
    );
    await governor.deploymentTransaction().wait(confirmations);
    const governorAddress = await governor.getAddress();
    console.log(`✅ GovernorV2 deployed to: ${governorAddress}`);

    // --- Configure DAO roles and ownership ---
    console.log("\n🔐 Configuring DAO roles and ownership...");

    // Transfer ownership of LNX Token to the Governor contract
    console.log("👑 Transferring LNX Token ownership to Governor...");
    await token.transferOwnership(governorAddress);
    console.log("✅ LNX Token ownership transferred.");

    // Grant PROPOSER_ROLE and EXECUTOR_ROLE to the Governor on the Timelock
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    console.log("📝 Granting PROPOSER_ROLE to Governor on Timelock...");
    await timelock.grantRole(PROPOSER_ROLE, governorAddress);
    console.log("⚡ Granting EXECUTOR_ROLE to Governor on Timelock...");
    await timelock.grantRole(EXECUTOR_ROLE, governorAddress);

    // Revoke deployer's ADMIN_ROLE on the Timelock
    console.log("🚫 Revoking deployer's ADMIN_ROLE on Timelock...");
    await timelock.revokeRole(ADMIN_ROLE, deployer.address);
    console.log("✅ Deployer's ADMIN_ROLE revoked.");

    console.log("🎉 DAO configuration complete.");
    
    // Save deployment info
    const deploymentInfo = {
      network: network.name,
      daoWallets: DAO_WALLETS,
      contracts: {
        token: tokenAddress,
        distribution: distributionAddress,
        timelock: timelockAddress,
        governor: governorAddress,
        reputation: reputationAddress
      },
      addresses: {
        router: routerAddress,
        treasury: treasuryAddress,
        airdropLiquidity: airdropMechanismAddress,
        founder: founderAddress,
        deployer: deployer.address
      },
      transactionHashes: {
        tokenDeployment: token.deploymentTransaction().hash,
        distributionDeployment: distribution.deploymentTransaction().hash,
        timelockDeployment: timelock.deploymentTransaction().hash,
        reputationDeployment: reputation.deploymentTransaction().hash,
        governorDeployment: governor.deploymentTransaction().hash,
        initialTransfer: transferTx.hash,
        initialDistribution: executeTx.hash
      },
      timestamp: new Date().toISOString(),
      blockNumbers: {
        token: (await token.deploymentTransaction().wait()).blockNumber,
        distribution: (await distribution.deploymentTransaction().wait()).blockNumber,
        timelock: (await timelock.deploymentTransaction().wait()).blockNumber,
        governor: (await governor.deploymentTransaction().wait()).blockNumber
      }
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

    console.log(`💾 Deployment information saved to ${deploymentFilePath}`);
    console.log("🎉 Deployment completed successfully!");
    
    // Print summary
    console.log("\n📋 DEPLOYMENT SUMMARY:");
    console.log("=" .repeat(50));
    console.log(`🌐 Network: ${network.name}`);
    console.log(`📋 LuminaryNexusToken: ${tokenAddress}`);
    console.log(`📦 LuminaryNexusDistribution: ${distributionAddress}`);
    console.log(`⏰ LuminaryNexusTimelock: ${timelockAddress}`);
    console.log(`📊 Reputation: ${reputationAddress}`);
    console.log(`🏛️ LuminaryNexusGovernorV2: ${governorAddress}`);
    console.log("=" .repeat(50));

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