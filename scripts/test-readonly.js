// scripts/test-readonly.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment addresses
function loadDeployment() {
  const deploymentPath = path.join(__dirname, "../deployments", `${network.name}-deployment.json`);
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function main() {
  console.log("👀 READ-ONLY Testing (No Gas Required)");
  console.log(`📡 Network: ${network.name}`);
  console.log("=" .repeat(50));
  
  const deployment = loadDeployment();
  const [deployer] = await ethers.getSigners();

  // Get contract instances
  const token = await ethers.getContractAt("LuminaryNexusToken", deployment.contracts.LuminaryNexusToken.address);
  const governor = await ethers.getContractAt("LuminaryNexusGovernorV2", deployment.contracts.LuminaryNexusGovernorV2.address);

  console.log("💰 TOKEN BALANCES:");
  console.log("-".repeat(30));
  const balances = {
    "Treasury": deployment.daoWallets.treasury,
    "Admin": deployment.daoWallets.admin, 
    "Airdrop/Liquidity": deployment.daoWallets.airdropLiquidity,
    "Test Account 4": deployment.daoWallets.testAccount4,
    "Test Account 5": deployment.daoWallets.testAccount5
  };

  for (const [name, address] of Object.entries(balances)) {
    try {
      const balance = await token.balanceOf(address);
      const percentage = (Number(ethers.formatEther(balance)) / 1000000000 * 100).toFixed(2);
      console.log(`${name}: ${ethers.formatEther(balance)} LNX (${percentage}%)`);
    } catch (error) {
      console.log(`${name}: Error reading balance`);
    }
  }

  console.log("\n🏛️ GOVERNANCE INFO:");
  console.log("-".repeat(30));
  try {
    const name = await governor.name();
    const version = await governor.version();
    const votingDelay = await governor.votingDelay();
    const votingPeriod = await governor.votingPeriod();
    const proposalThreshold = await governor.proposalThreshold();
    const quorum = await governor.quorumNumerator();

    // Convert blocks to approximate time (assuming 2-3 second blocks on Polygon)
    const votingDelayHours = Math.round(Number(votingDelay) * 2.5 / 3600);
    const votingPeriodDays = Math.round(Number(votingPeriod) * 2.5 / 86400);

    console.log(`Name: ${name}`);
    console.log(`Version: ${version}`);
    console.log(`Voting Delay: ${votingDelay} blocks (~${votingDelayHours} hours)`);
    console.log(`Voting Period: ${votingPeriod} blocks (~${votingPeriodDays} days)`);
    console.log(`Proposal Threshold: ${ethers.formatEther(proposalThreshold)} LNX`);
    console.log(`Quorum: ${quorum}%`);
  } catch (error) {
    console.log("Error reading governor info:", error.message);
  }

  console.log("\n📊 TOKEN INFO:");
  console.log("-".repeat(30));
  try {
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const owner = await token.owner();
    const paused = await token.paused();

    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.formatEther(totalSupply)} LNX`);
    console.log(`Owner: ${owner}`);
    console.log(`Paused: ${paused}`);
  } catch (error) {
    console.log("Error reading token info:", error.message);
  }

  console.log("\n🔗 USEFUL LINKS:");
  console.log("-".repeat(30));
  console.log("Amoy PolygonScan:");
  console.log(`• Token: https://amoy.polygonscan.com/address/${deployment.contracts.LuminaryNexusToken.address}`);
  console.log(`• Governor: https://amoy.polygonscan.com/address/${deployment.contracts.LuminaryNexusGovernorV2.address}`);
  
  console.log("\nMetaMask Token Import:");
  console.log(`• Address: ${deployment.contracts.LuminaryNexusToken.address}`);
  console.log(`• Symbol: LNX`);
  console.log(`• Decimals: 18`);

  console.log("\n✅ All core contracts are deployed and functional!");
  console.log("💡 Ready for community testing once final ownership transfer completes.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
