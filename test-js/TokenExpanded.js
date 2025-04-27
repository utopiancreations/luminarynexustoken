const { expect } = require("chai");

describe("LuminaryNexusToken", function() {
  let token;
  let mockRouter;
  let owner;
  let treasury;
  let addr1;
  let addr2;
  let addr3;

  beforeEach(async function() {
    [owner, treasury, addr1, addr2, addr3] = await ethers.getSigners();
    
    // Deploy MockRouter
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
    mockRouter = await MockRouter.deploy();
    
    // Deploy token
    const Token = await ethers.getContractFactory("LuminaryNexusToken");
    token = await Token.deploy(
      owner.address,
      treasury.address,
      await mockRouter.getAddress()
    );
  });

  describe("Deployment", function() {
    it("Should set the right name and symbol", async function() {
      expect(await token.name()).to.equal("Luminary Nexus Token");
      expect(await token.symbol()).to.equal("LNX");
    });

    it("Should assign the total supply to the owner", async function() {
      expect(await token.balanceOf(owner.address)).to.equal(await token.totalSupply());
    });

    it("Should set the right owner", async function() {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should set the treasury address correctly", async function() {
      expect(await token.communityTreasury()).to.equal(treasury.address);
    });

    it("Should exclude owner and treasury from fees", async function() {
      expect(await token.isExcludedFromFee(owner.address)).to.equal(true);
      expect(await token.isExcludedFromFee(treasury.address)).to.equal(true);
    });
  });

  describe("Transactions", function() {
    it("Should transfer tokens between accounts without fees when sender is excluded", async function() {
      // Transfer 1000 tokens from owner to addr1
      await token.transfer(addr1.address, ethers.parseEther("1000"));
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(ethers.parseEther("1000"));
    });

    it("Should transfer tokens with fees when sender is not excluded", async function() {
      // First transfer tokens to addr1 (no fees since owner is excluded)
      await token.transfer(addr1.address, ethers.parseEther("10000"));
      
      // Now addr1 transfers to addr2 (should incur fees)
      await token.connect(addr1).transfer(addr2.address, ethers.parseEther("1000"));
      
      // Get fee percentages
      const treasuryFeePercent = await token.treasuryFeePercent();
      const liquidityFeePercent = await token.liquidityFeePercent();
      
      // Calculate expected amounts
      const transferAmount = ethers.parseEther("1000");
      const treasuryFee = (transferAmount * BigInt(treasuryFeePercent)) / 10000n;
      const liquidityFee = (transferAmount * BigInt(liquidityFeePercent)) / 10000n;
      const expectedReceivedAmount = transferAmount - treasuryFee - liquidityFee;
      
      // Check balances
      expect(await token.balanceOf(addr2.address)).to.equal(expectedReceivedAmount);
      expect(await token.balanceOf(treasury.address)).to.equal(treasuryFee);
      expect(await token.balanceOf(await token.getAddress())).to.equal(liquidityFee);
    });
  });

  describe("Fee Management", function() {
    it("Should allow owner to update fee percentages", async function() {
      await token.setTreasuryFeePercent(200); // 2%
      await token.setLiquidityFeePercent(100); // 1%
      
      expect(await token.treasuryFeePercent()).to.equal(200);
      expect(await token.liquidityFeePercent()).to.equal(100);
    });

    it("Should revert if non-owner tries to update fees", async function() {
      await expect(
        token.connect(addr1).setTreasuryFeePercent(200)
      ).to.be.reverted;
    });

    it("Should allow owner to exclude accounts from fees", async function() {
      await token.excludeFromFee(addr1.address, true);
      expect(await token.isExcludedFromFee(addr1.address)).to.equal(true);
      
      // Transfer from addr1 to addr2 should now not incur fees
      await token.transfer(addr1.address, ethers.parseEther("1000"));
      await token.connect(addr1).transfer(addr2.address, ethers.parseEther("500"));
      
      expect(await token.balanceOf(addr2.address)).to.equal(ethers.parseEther("500"));
    });
  });

  describe("Inflation", function() {
    it("Should allow owner to update inflation rate", async function() {
      await token.setInflationRate(300); // 3%
      expect(await token.currentAnnualInflationRate()).to.equal(300);
    });

    it("Should mint tokens based on inflation rate", async function() {
      // Get initial values
      const initialTreasuryBalance = await token.balanceOf(treasury.address);
      const initialSupply = await token.totalSupply();
      
      // Increase time by 1 year (in seconds)
      await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
      await ethers.provider.send("evm_mine");
      
      // Trigger inflation mint
      await token.triggerInflationMint();
      
      // Check results
      const newTreasuryBalance = await token.balanceOf(treasury.address);
      const inflationRate = await token.currentAnnualInflationRate();
      
      // Expected inflation = 2% of total supply
      const expectedInflation = (initialSupply * BigInt(inflationRate)) / 10000n;
      
      // Allow for minor differences due to block timestamp precision
      const actualInflation = newTreasuryBalance - initialTreasuryBalance;
      
      // Should be within 0.1% of expected amount
      const difference = actualInflation > expectedInflation 
        ? actualInflation - expectedInflation 
        : expectedInflation - actualInflation;
      
      expect(difference).to.be.lessThan(expectedInflation / 1000n);
    });
  });
});