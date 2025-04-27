const { expect } = require("chai");
const hre = require("hardhat");

describe("LuminaryNexusToken", function () {
  let lnxToken;
  let owner, treasury, router, addr1, addr2;
  
  beforeEach(async function () {
    // Get signers for testing
    [owner, treasury, router, addr1, addr2] = await hre.ethers.getSigners();
    
    // Deploy mock router first
    const MockRouter = await hre.ethers.getContractFactory("MockUniswapV2Router");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    const mockRouterAddress = await mockRouter.getAddress();
    
    // Deploy the token contract
    const Token = await hre.ethers.getContractFactory("LuminaryNexusToken");
    lnxToken = await Token.deploy(
      owner.address,
      treasury.address,
      mockRouterAddress
    );
    await lnxToken.waitForDeployment();
  });

  it("Should set the right owner", async function () {
    expect(await lnxToken.owner()).to.equal(owner.address);
  });
  
  it("Should assign the total supply to the owner", async function () {
    const ownerBalance = await lnxToken.balanceOf(owner.address);
    expect(await lnxToken.totalSupply()).to.equal(ownerBalance);
  });
  
  it("Should take fees when transferring between non-excluded addresses", async function () {
    // First transfer some tokens to addr1 from owner (no fees as owner is excluded)
    const amount = hre.ethers.parseEther("10000");
    await lnxToken.transfer(addr1.address, amount);
    
    // Now addr1 transfers to addr2 (should incur fees)
    const transferAmount = hre.ethers.parseEther("1000");
    await lnxToken.connect(addr1).transfer(addr2.address, transferAmount);
    
    // Calculate expected fees
    const treasuryFeePercent = await lnxToken.treasuryFeePercent();
    const liquidityFeePercent = await lnxToken.liquidityFeePercent();
    const basisPoints = 10000n;
    
    const treasuryFee = transferAmount * treasuryFeePercent / basisPoints;
    const liquidityFee = transferAmount * liquidityFeePercent / basisPoints;
    const totalFees = treasuryFee + liquidityFee;
    
    const expectedReceivedAmount = transferAmount - totalFees;
    
    // Verify balances - use BigInt arithmetic for precision
    const addr2Balance = await lnxToken.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(expectedReceivedAmount);
  });
});