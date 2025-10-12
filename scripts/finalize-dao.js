// scripts/finalize-dao.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

function loadDeployment() {
  const deploymentPath = path.join(__dirname, "../deployments", `${network.name}-deployment.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment file found for network ${network.name}`);
  }
  return { deployment: JSON.parse(fs.readFileSync(deploymentPath, 'utf8')), deploymentPath };
}

async function main() {
  console.log("🔐 Finalizing DAO configuration (no redeployments)");
  console.log(`📡 Network: ${network.name}`);

  const { deployment, deploymentPath } = loadDeployment();
  const [deployer] = await ethers.getSigners();
  console.log(`👤 Using account: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MATIC`);

  const tokenAddr = deployment.contracts.LuminaryNexusToken.address;
  const timelockAddr = deployment.contracts.LuminaryNexusTimelock.address;
  const governorAddr = deployment.contracts.LuminaryNexusGovernorV2.address;

  const token = await ethers.getContractAt("LuminaryNexusToken", tokenAddr);
  const timelock = await ethers.getContractAt("LuminaryNexusTimelock", timelockAddr);

  let ownershipTransferred = !!(deployment.status && deployment.status.ownershipTransferred);
  let rolesConfigured = !!(deployment.status && deployment.status.rolesConfigured);

  // 1) Transfer token ownership to Governor if not already
  try {
    const currentOwner = await token.owner();
    if (currentOwner.toLowerCase() !== governorAddr.toLowerCase()) {
      console.log(`👑 Transferring LNX ownership to Governor (${governorAddr})...`);
      const tx = await token.transferOwnership(governorAddr);
      await tx.wait(2);
      console.log("✅ Ownership transferred");
      ownershipTransferred = true;
    } else {
      console.log("✅ Ownership already set to Governor, skipping");
      ownershipTransferred = true;
    }
  } catch (err) {
    console.log(`⚠️ Ownership transfer step failed: ${err.message}`);
  }

  // 2) Configure Timelock roles if not already
  try {
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

    const hasProposer = await timelock.hasRole(PROPOSER_ROLE, governorAddr);
    const hasExecutor = await timelock.hasRole(EXECUTOR_ROLE, governorAddr);
    const deployerIsAdmin = await timelock.hasRole(ADMIN_ROLE, deployer.address);

    if (!hasProposer) {
      console.log("📝 Granting PROPOSER_ROLE to Governor...");
      const tx = await timelock.grantRole(PROPOSER_ROLE, governorAddr);
      await tx.wait(2);
    } else {
      console.log("✅ Governor already has PROPOSER_ROLE");
    }

    if (!hasExecutor) {
      console.log("⚡ Granting EXECUTOR_ROLE to Governor...");
      const tx = await timelock.grantRole(EXECUTOR_ROLE, governorAddr);
      await tx.wait(2);
    } else {
      console.log("✅ Governor already has EXECUTOR_ROLE");
    }

    if (deployerIsAdmin) {
      console.log("🚫 Revoking DEFAULT_ADMIN_ROLE from deployer...");
      const tx = await timelock.revokeRole(ADMIN_ROLE, deployer.address);
      await tx.wait(2);
      console.log("✅ Deployer admin revoked");
    } else {
      console.log("✅ Deployer is not admin on Timelock");
    }

    rolesConfigured = true;
  } catch (err) {
    console.log(`⚠️ Role configuration step failed: ${err.message}`);
  }

  // 3) Save updated status to deployment file
  deployment.status = {
    ...(deployment.status || {}),
    deployed: true,
    distributionExecuted: !!(deployment.status && deployment.status.distributionExecuted),
    ownershipTransferred,
    rolesConfigured,
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`💾 Updated deployment status saved to ${deploymentPath}`);
  console.log("🎉 Finalization complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
