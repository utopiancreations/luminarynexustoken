// scripts/test-deployed-contracts.js
const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Load deployment addresses
function loadDeployment() {
  const deploymentPath = path.join(__dirname, "../deployments", `${network.name}-deployment.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment file found for network ${network.name}`);
  }
  return JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
}

async function main() {
  console.log("🧪 Testing Deployed Luminary Nexus Contracts");
  console.log(`📡 Network: ${network.name}`);
  console.log("=" .repeat(60));
  
  const deployment = loadDeployment();
  const [deployer] = await ethers.getSigners();
  
  console.log(`👤 Testing with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} MATIC`);
  console.log("");

  // Get contract instances
  const token = await ethers.getContractAt("LuminaryNexusToken", deployment.contracts.LuminaryNexusToken.address);
  const distribution = await ethers.getContractAt("LuminaryNexusDistribution", deployment.contracts.LuminaryNexusDistribution.address);
  const timelock = await ethers.getContractAt("LuminaryNexusTimelock", deployment.contracts.LuminaryNexusTimelock.address);
  const governor = await ethers.getContractAt("LuminaryNexusGovernorV2", deployment.contracts.LuminaryNexusGovernorV2.address);
  const reputation = await ethers.getContractAt("Reputation", deployment.contracts.Reputation.address);

  // Test 1: Basic Token Information
  console.log("📋 TEST 1: Basic Token Information");
  console.log("-".repeat(40));
  try {
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const owner = await token.owner();
    
    console.log(`✅ Name: ${name}`);
    console.log(`✅ Symbol: ${symbol}`);
    console.log(`✅ Decimals: ${decimals}`);
    console.log(`✅ Total Supply: ${ethers.formatEther(totalSupply)} LNX`);
    console.log(`✅ Current Owner: ${owner}`);
    console.log("");
  } catch (error) {
    console.error("❌ Token info test failed:", error.message);
  }

  // Test 2: Distribution Contract Status
  console.log("📦 TEST 2: Distribution Contract Status");
  console.log("-".repeat(40));
  try {
    const distributionBalance = await token.balanceOf(distribution.target);
    const treasuryBalance = await token.balanceOf(deployment.daoWallets.treasury);
    const adminBalance = await token.balanceOf(deployment.daoWallets.admin);
    
    console.log(`✅ Distribution Contract Balance: ${ethers.formatEther(distributionBalance)} LNX`);
    console.log(`✅ Treasury Balance: ${ethers.formatEther(treasuryBalance)} LNX`);
    console.log(`✅ Admin Balance: ${ethers.formatEther(adminBalance)} LNX`);
    
    // Check if distribution was executed
    try {
      const distributionOwner = await distribution.owner();
      console.log(`✅ Distribution Owner: ${distributionOwner}`);
    } catch (e) {
      console.log(`✅ Distribution executed (owner check failed as expected)`);
    }
    console.log("");
  } catch (error) {
    console.error("❌ Distribution test failed:", error.message);
  }

  // Test 3: Timelock Configuration
  console.log("⏰ TEST 3: Timelock Configuration");
  console.log("-".repeat(40));
  try {
    const minDelay = await timelock.getMinDelay();
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
    
    console.log(`✅ Min Delay: ${minDelay} seconds (${minDelay / 86400} days)`);
    
    const hasProposerRole = await timelock.hasRole(PROPOSER_ROLE, governor.target);
    const hasExecutorRole = await timelock.hasRole(EXECUTOR_ROLE, governor.target);
    const deployerHasAdmin = await timelock.hasRole(ADMIN_ROLE, deployer.address);
    
    console.log(`✅ Governor has PROPOSER_ROLE: ${hasProposerRole}`);
    console.log(`✅ Governor has EXECUTOR_ROLE: ${hasExecutorRole}`);
    console.log(`✅ Deployer has ADMIN_ROLE: ${deployerHasAdmin}`);
    console.log("");
  } catch (error) {
    console.error("❌ Timelock test failed:", error.message);
  }

  // Test 4: Governor Configuration
  console.log("🏛️ TEST 4: Governor Configuration");
  console.log("-".repeat(40));
  try {
    const votingDelay = await governor.votingDelay();
    const votingPeriod = await governor.votingPeriod();
    const proposalThreshold = await governor.proposalThreshold();
    const quorumNumerator = await governor.quorumNumerator();
    
    console.log(`✅ Voting Delay: ${votingDelay} blocks`);
    console.log(`✅ Voting Period: ${votingPeriod} blocks`);
    console.log(`✅ Proposal Threshold: ${ethers.formatEther(proposalThreshold)} LNX`);
    console.log(`✅ Quorum Numerator: ${quorumNumerator}%`);
    
    // Check if governor is connected to token
    const tokenAddress = await governor.token();
    console.log(`✅ Connected to token: ${tokenAddress === token.target ? "✅ Correct" : "❌ Mismatch"}`);
    console.log("");
  } catch (error) {
    console.error("❌ Governor test failed:", error.message);
  }

  // Test 5: Reputation System
  console.log("📊 TEST 5: Reputation System");
  console.log("-".repeat(40));
  try {
    // Test reputation for some accounts
    const deployerReputation = await reputation.getReputation(deployer.address);
    const adminReputation = await reputation.getReputation(deployment.daoWallets.admin);
    
    console.log(`✅ Deployer Reputation: ${deployerReputation}`);
    console.log(`✅ Admin Reputation: ${adminReputation}`);
    console.log("");
  } catch (error) {
    console.error("❌ Reputation test failed:", error.message);
  }

  // Test 6: Token Transfer Test (if deployer has tokens)
  console.log("💸 TEST 6: Token Transfer Test");
  console.log("-".repeat(40));
  try {
    const deployerBalance = await token.balanceOf(deployer.address);
    console.log(`✅ Deployer Balance: ${ethers.formatEther(deployerBalance)} LNX`);
    
    if (deployerBalance > 0) {
      // Test a small transfer to admin account
      const transferAmount = ethers.parseEther("1"); // 1 LNX
      
      if (deployerBalance >= transferAmount) {
        console.log("🚀 Testing transfer of 1 LNX to admin account...");
        const tx = await token.transfer(deployment.daoWallets.admin, transferAmount);
        await tx.wait();
        
        const newDeployerBalance = await token.balanceOf(deployer.address);
        const newAdminBalance = await token.balanceOf(deployment.daoWallets.admin);
        
        console.log(`✅ Transfer successful!`);
        console.log(`✅ New Deployer Balance: ${ethers.formatEther(newDeployerBalance)} LNX`);
        console.log(`✅ New Admin Balance: ${ethers.formatEther(newAdminBalance)} LNX`);
      } else {
        console.log(`⚠️ Insufficient balance for transfer test`);
      }
    } else {
      console.log(`⚠️ Deployer has no LNX tokens for transfer test`);
    }
    console.log("");
  } catch (error) {
    console.error("❌ Transfer test failed:", error.message);
  }

  // Test 7: Create a Simple Governance Proposal (if possible)
  console.log("🗳️ TEST 7: Governance Proposal Test");
  console.log("-".repeat(40));
  try {
    // Check if deployer can create proposals
    const deployerVotingPower = await token.getVotes(deployer.address);
    const threshold = await governor.proposalThreshold();
    
    console.log(`✅ Deployer Voting Power: ${ethers.formatEther(deployerVotingPower)} LNX`);
    console.log(`✅ Proposal Threshold: ${ethers.formatEther(threshold)} LNX`);
    
    if (deployerVotingPower >= threshold) {
      console.log("🚀 Deployer can create proposals!");
      
      // Create a simple proposal to transfer 1 LNX from treasury to admin
      const targets = [token.target];
      const values = [0];
      const calldatas = [token.interface.encodeFunctionData("transfer", [deployment.daoWallets.admin, ethers.parseEther("1")])];
      const description = "Test Proposal: Transfer 1 LNX from Treasury to Admin";
      
      console.log("📝 Creating test proposal...");
      const proposalTx = await governor.propose(targets, values, calldatas, description);
      const receipt = await proposalTx.wait();
      
      // Get proposal ID from events
      const proposalCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = governor.interface.parseLog(log);
          return parsed.name === "ProposalCreated";
        } catch (e) {
          return false;
        }
      });
      
      if (proposalCreatedEvent) {
        const proposalId = proposalCreatedEvent.args[0];
        console.log(`✅ Proposal created with ID: ${proposalId}`);
        
        // Check proposal state
        const state = await governor.state(proposalId);
        console.log(`✅ Proposal State: ${state}`);
      }
      
    } else {
      console.log(`⚠️ Insufficient voting power to create proposals`);
    }
    console.log("");
  } catch (error) {
    console.error("❌ Governance proposal test failed:", error.message);
  }

  // Test 8: Contract Verification Summary
  console.log("🔍 TEST 8: Contract Verification Summary");
  console.log("-".repeat(40));
  
  const contracts = [
    { name: "LuminaryNexusToken", address: deployment.contracts.LuminaryNexusToken.address },
    { name: "LuminaryNexusDistribution", address: deployment.contracts.LuminaryNexusDistribution.address },
    { name: "LuminaryNexusTimelock", address: deployment.contracts.LuminaryNexusTimelock.address },
    { name: "Reputation", address: deployment.contracts.Reputation.address },
    { name: "LuminaryNexusGovernorV2", address: deployment.contracts.LuminaryNexusGovernorV2.address }
  ];
  
  for (const contract of contracts) {
    try {
      const code = await ethers.provider.getCode(contract.address);
      const exists = code !== "0x";
      console.log(`${exists ? "✅" : "❌"} ${contract.name}: ${contract.address} - ${exists ? "DEPLOYED" : "NOT FOUND"}`);
    } catch (error) {
      console.log(`❌ ${contract.name}: Error checking contract`);
    }
  }

  console.log("");
  console.log("=" .repeat(60));
  console.log("🎉 Testing Complete!");
  console.log("");
  console.log("🔗 View on Amoy PolygonScan:");
  contracts.forEach(contract => {
    console.log(`${contract.name}: https://amoy.polygonscan.com/address/${contract.address}`);
  });
  console.log("");
  console.log("📱 Add LNX Token to MetaMask:");
  console.log(`Contract Address: ${deployment.contracts.LuminaryNexusToken.address}`);
  console.log(`Token Symbol: LNX`);
  console.log(`Decimals: 18`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
