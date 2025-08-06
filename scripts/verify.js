// scripts/verify.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("🔍 Starting contract verification process...");
    console.log(`📡 Network: ${network.name}`);

    // Load deployment information
    const deploymentsDir = path.join(__dirname, "../deployments");
    const deploymentFilePath = path.join(deploymentsDir, `${network.name}-deployment.json`);

    if (!fs.existsSync(deploymentFilePath)) {
      throw new Error(`❌ Deployment file not found: ${deploymentFilePath}`);
    }

    const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, 'utf8'));
    console.log("✅ Loaded deployment information");

    // Extract contract addresses and constructor arguments
    const {
      contracts: { token, distribution, timelock, governor, reputation },
      addresses: { router, treasury, airdropLiquidity, founder, deployer }
    } = deploymentInfo;

    console.log("\n📋 CONTRACT VERIFICATION SUMMARY:");
    console.log("=" .repeat(60));
    console.log(`🌐 Network: ${network.name}`);
    console.log(`📋 Token: ${token}`);
    console.log(`📦 Distribution: ${distribution}`);
    console.log(`⏰ Timelock: ${timelock}`);
    console.log(`📊 Reputation: ${reputation}`);
    console.log(`🏛️ Governor: ${governor}`);
    console.log("=" .repeat(60));

    let successCount = 0;
    let totalContracts = 5;

    // Verify LuminaryNexusToken
    try {
      console.log("\n🔍 Verifying LuminaryNexusToken...");
      await hre.run("verify:verify", {
        address: token,
        constructorArguments: [
          deployer,   // _initialOwner
          treasury,   // _communityTreasury  
          router      // _routerAddress
        ],
      });
      console.log("✅ LuminaryNexusToken verified successfully!");
      successCount++;
    } catch (error) {
      console.error("❌ LuminaryNexusToken verification failed:", error.message);
      console.log(`📝 Manual verification command:`);
      console.log(`npx hardhat verify --network ${network.name} ${token} "${deployer}" "${treasury}" "${router}"`);
    }

    // Verify LuminaryNexusDistribution
    try {
      console.log("\n🔍 Verifying LuminaryNexusDistribution...");
      await hre.run("verify:verify", {
        address: distribution,
        constructorArguments: [
          token,            // _lnxTokenAddress
          treasury,         // _daoTreasury
          founder,          // _founder
          airdropLiquidity, // _airdropMechanism
          deployer          // _initialDistributionOwner
        ],
      });
      console.log("✅ LuminaryNexusDistribution verified successfully!");
      successCount++;
    } catch (error) {
      console.error("❌ LuminaryNexusDistribution verification failed:", error.message);
      console.log(`📝 Manual verification command:`);
      console.log(`npx hardhat verify --network ${network.name} ${distribution} "${token}" "${treasury}" "${founder}" "${airdropLiquidity}" "${deployer}"`);
    }

    // Verify LuminaryNexusTimelock
    try {
      console.log("\n🔍 Verifying LuminaryNexusTimelock...");
      await hre.run("verify:verify", {
        address: timelock,
        constructorArguments: [
          deployer, // proposer (initially deployer, later governor)
          deployer, // executor (initially deployer, later governor)
          deployer  // admin (initially deployer, later revoked)
        ],
      });
      console.log("✅ LuminaryNexusTimelock verified successfully!");
      successCount++;
    } catch (error) {
      console.error("❌ LuminaryNexusTimelock verification failed:", error.message);
      console.log(`📝 Manual verification command:`);
      console.log(`npx hardhat verify --network ${network.name} ${timelock} "${deployer}" "${deployer}" "${deployer}"`);
    }

    // Verify Reputation contract
    try {
      console.log("\n🔍 Verifying Reputation contract...");
      await hre.run("verify:verify", {
        address: reputation,
        constructorArguments: [], // Reputation contract has no constructor arguments
      });
      console.log("✅ Reputation contract verified successfully!");
      successCount++;
    } catch (error) {
      console.error("❌ Reputation contract verification failed:", error.message);
      console.log(`📝 Manual verification command:`);
      console.log(`npx hardhat verify --network ${network.name} ${reputation}`);
    }

    // Verify LuminaryNexusGovernorV2
    try {
      console.log("\n🔍 Verifying LuminaryNexusGovernorV2...");
      await hre.run("verify:verify", {
        address: governor,
        constructorArguments: [
          token,      // _lnxTokenAddress
          timelock,   // _timelockAddress
          reputation  // _reputationAddress
        ],
      });
      console.log("✅ LuminaryNexusGovernorV2 verified successfully!");
      successCount++;
    } catch (error) {
      console.error("❌ LuminaryNexusGovernorV2 verification failed:", error.message);
      console.log(`📝 Manual verification command:`);
      console.log(`npx hardhat verify --network ${network.name} ${governor} "${token}" "${timelock}" "${reputation}"`);
    }

    // Verification summary
    console.log("\n🎯 VERIFICATION RESULTS:");
    console.log("=" .repeat(60));
    console.log(`✅ Successfully verified: ${successCount}/${totalContracts} contracts`);
    console.log(`❌ Failed verifications: ${totalContracts - successCount}/${totalContracts} contracts`);
    
    if (successCount === totalContracts) {
      console.log("🎉 All contracts verified successfully!");
    } else {
      console.log("⚠️ Some contracts failed verification. Check the manual commands above.");
    }
    console.log("=" .repeat(60));

    // Save verification status
    const verificationInfo = {
      network: network.name,
      timestamp: new Date().toISOString(),
      results: {
        token: successCount >= 1,
        distribution: successCount >= 2,
        timelock: successCount >= 3,
        reputation: successCount >= 4,
        governor: successCount >= 5
      },
      successCount,
      totalContracts
    };

    const verificationFilePath = path.join(deploymentsDir, `${network.name}-verification.json`);
    fs.writeFileSync(
      verificationFilePath,
      JSON.stringify(verificationInfo, null, 2)
    );

    console.log(`💾 Verification results saved to ${verificationFilePath}`);

  } catch (error) {
    console.error("❌ Verification process failed:", error);
    process.exit(1);
  }
}

// Execute the verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });