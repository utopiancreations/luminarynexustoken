// scripts/inspect-contract.js
const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  try {
    console.log("Inspecting LuminaryNexusToken Contract Interface...");
    
    // Get the contract factory
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    
    // Inspect the constructor parameters
    const constructorFragment = LuminaryNexusToken.interface.deploy;
    console.log("\n--- Constructor Parameters ---");
    console.log(`Number of parameters: ${constructorFragment.inputs.length}`);
    
    if (constructorFragment.inputs.length > 0) {
      console.log("\nParameter Details:");
      constructorFragment.inputs.forEach((param, index) => {
        console.log(`${index+1}. ${param.name} (${param.type})`);
      });
    } else {
      console.log("No constructor parameters found!");
    }
    
    // Inspect public functions
    console.log("\n--- Public Functions ---");
    const functions = Object.values(LuminaryNexusToken.interface.functions)
      .filter(fragment => fragment.type === 'function');
    
    functions.forEach(func => {
      const inputs = func.inputs.map(input => `${input.name}:${input.type}`).join(', ');
      const outputs = func.outputs.map(output => output.type).join(', ');
      console.log(`${func.name}(${inputs}) -> (${outputs}) [${func.stateMutability}]`);
    });
    
    // Look for the source code of the contract
    const contractsDir = path.join(__dirname, "../contracts");
    const contractPath = path.join(contractsDir, "LuminaryNexusToken.sol");
    
    if (fs.existsSync(contractPath)) {
      const contractSource = fs.readFileSync(contractPath, "utf8");
      
      // Find the constructor in source code
      const constructorMatch = contractSource.match(/constructor\s*\([^)]*\)\s*[^{]*/);
      if (constructorMatch) {
        console.log("\n--- Constructor from Source Code ---");
        console.log(constructorMatch[0].trim());
      }
    }
    
  } catch (error) {
    console.error("Inspection failed:", error);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });