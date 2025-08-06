// Basic test for LuminaryNexusToken
const { expect } = require("chai");

describe("LuminaryNexusToken", function () {
  let Token;
  let lnxToken;
  let MockRouter;
  let mockRouter;
  let owner;
  let treasury;
  let addr1;
  let addr2;

  before(async function () {
    // Import ethers from Hardhat
    const hardhat = require("hardhat");
    const ethers = hardhat.ethers;
    
    // Get signers
    const signers = await ethers.getSigners();
    owner = signers[0];
    treasury = signers[1];
    addr1 = signers[2];
    addr2 = signers[3];
    
    console.log("Testing with owner address:", owner.address);
    
    // Deploy mock router
    MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
    mockRouter = await MockRouter.deploy();
    
    // Deploy token
    Token = await ethers.getContractFactory("LuminaryNexusToken");
    lnxToken = await Token.deploy(
      owner.address,
      treasury.address,
      await mockRouter.getAddress()
    );
    
    console.log("Token deployed at:", await lnxToken.getAddress());
  });

  it("Should have the right name and symbol", async function () {
    expect(await lnxToken.name()).to.equal("Luminary Nexus Token");
    expect(await lnxToken.symbol()).to.equal("LNX");
  });
});