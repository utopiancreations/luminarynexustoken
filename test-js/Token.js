const { expect } = require("chai");

describe("Token", function() {
  it("Should deploy and have correct name", async function() {
    const [owner, treasury] = await ethers.getSigners();
    
    // Deploy MockRouter
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
    const mockRouter = await MockRouter.deploy();
    
    // Deploy token
    const Token = await ethers.getContractFactory("LuminaryNexusToken");
    const token = await Token.deploy(
      owner.address,
      treasury.address,
      await mockRouter.getAddress()
    );
    
    expect(await token.name()).to.equal("Luminary Nexus Token");
  });
});