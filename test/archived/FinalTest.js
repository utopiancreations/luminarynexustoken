const { expect } = require("chai");

// This is the simplest possible test to verify your testing environment works
describe("LuminaryNexusToken Contract", function () {
  it("Should deploy LuminaryNexusToken", async function () {
    // Get signers
    const [deployer, treasury] = await ethers.getSigners();
    
    // First deploy a mock router
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
    const mockRouter = await MockRouter.deploy();
    
    // Then deploy the token contract
    const LNXToken = await ethers.getContractFactory("LuminaryNexusToken");
    const token = await LNXToken.deploy(
      deployer.address, 
      treasury.address, 
      await mockRouter.getAddress()
    );
    
    // Basic check that deploying worked
    expect(await token.name()).to.equal("Luminary Nexus Token");
  });
});