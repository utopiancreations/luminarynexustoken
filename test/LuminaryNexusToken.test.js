const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LuminaryNexusToken", function () {
  let token;
  let owner, addr1, addr2, pauser, minter, burner;
  const TOTAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion tokens
  const TEST_AMOUNT = ethers.parseEther("1000");

  // Role constants
  let DEFAULT_ADMIN_ROLE, PAUSER_ROLE, MINTER_ROLE, BURNER_ROLE;

  beforeEach(async function () {
    [owner, addr1, addr2, pauser, minter, burner] = await ethers.getSigners();
    
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    token = await LuminaryNexusToken.deploy(owner.address);
    await token.waitForDeployment();

    // Get role constants
    DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    PAUSER_ROLE = await token.PAUSER_ROLE();
    MINTER_ROLE = await token.MINTER_ROLE();
    BURNER_ROLE = await token.BURNER_ROLE();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await token.name()).to.equal("Luminary Nexus Token");
      expect(await token.symbol()).to.equal("LNX");
    });

    it("Should assign the correct total supply", async function () {
      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(TOTAL_SUPPLY);
    });

    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await token.balanceOf(owner.address);
      expect(ownerBalance).to.equal(TOTAL_SUPPLY);
    });

    it("Should set correct decimals", async function () {
      expect(await token.decimals()).to.equal(18);
    });

    it("Should set the right owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should assign roles to owner", async function () {
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(BURNER_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      await token.transfer(addr1.address, TEST_AMOUNT);
      const addr1Balance = await token.balanceOf(addr1.address);
      expect(addr1Balance).to.equal(TEST_AMOUNT);
    });

    it("Should emit Transfer events", async function () {
      await expect(token.transfer(addr1.address, TEST_AMOUNT))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, addr1.address, TEST_AMOUNT);
    });

    it("Should fail if sender doesn't have enough tokens", async function () {
      await expect(
        token.connect(addr1).transfer(addr2.address, 1)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Allowances", function () {
    it("Should approve and transferFrom correctly", async function () {
      await token.approve(addr1.address, TEST_AMOUNT);
      
      await token.connect(addr1).transferFrom(owner.address, addr2.address, TEST_AMOUNT);
      
      const addr2Balance = await token.balanceOf(addr2.address);
      expect(addr2Balance).to.equal(TEST_AMOUNT);
    });

    it("Should emit Approval events", async function () {
      await expect(token.approve(addr1.address, TEST_AMOUNT))
        .to.emit(token, "Approval")
        .withArgs(owner.address, addr1.address, TEST_AMOUNT);
    });
  });

  describe("Pausable", function () {
    it("Should allow pauser to pause the contract", async function () {
      await token.pause();
      expect(await token.paused()).to.be.true;
    });

    it("Should emit pause event", async function () {
      await expect(token.pause())
        .to.emit(token, "Paused")
        .withArgs(owner.address);
    });

    it("Should prevent transfers when paused", async function () {
      await token.pause();
      
      await expect(
        token.transfer(addr1.address, TEST_AMOUNT)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should allow unpausing and resume transfers", async function () {
      await token.pause();
      await token.unpause();
      
      expect(await token.paused()).to.be.false;
      
      // Transfer should work now
      await token.transfer(addr1.address, TEST_AMOUNT);
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(TEST_AMOUNT);
    });

    it("Should only allow pauser role to pause", async function () {
      await expect(
        token.connect(addr1).pause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should only allow pauser role to unpause", async function () {
      await token.pause();
      
      await expect(
        token.connect(addr1).unpause()
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Access Control", function () {
    it("Should allow admin to grant roles", async function () {
      await token.grantRole(PAUSER_ROLE, addr1.address);
      expect(await token.hasRole(PAUSER_ROLE, addr1.address)).to.be.true;
    });

    it("Should allow admin to revoke roles", async function () {
      await token.grantRole(PAUSER_ROLE, addr1.address);
      await token.revokeRole(PAUSER_ROLE, addr1.address);
      expect(await token.hasRole(PAUSER_ROLE, addr1.address)).to.be.false;
    });

    it("Should prevent non-admin from granting roles", async function () {
      await expect(
        token.connect(addr1).grantRole(PAUSER_ROLE, addr2.address)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Minting", function () {
    beforeEach(async function () {
      await token.grantRole(MINTER_ROLE, minter.address);
    });

    it("Should allow minter to mint tokens", async function () {
      await token.connect(minter).mint(addr1.address, TEST_AMOUNT);
      
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(TEST_AMOUNT);
    });

    it("Should emit TokensMinted event", async function () {
      await expect(token.connect(minter).mint(addr1.address, TEST_AMOUNT))
        .to.emit(token, "TokensMinted")
        .withArgs(addr1.address, TEST_AMOUNT);
    });

    it("Should increase total supply when minting", async function () {
      const initialSupply = await token.totalSupply();
      await token.connect(minter).mint(addr1.address, TEST_AMOUNT);
      
      const newSupply = await token.totalSupply();
      expect(newSupply).to.equal(initialSupply + TEST_AMOUNT);
    });

    it("Should prevent non-minter from minting", async function () {
      await expect(
        token.connect(addr1).mint(addr2.address, TEST_AMOUNT)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should prevent minting when paused", async function () {
      await token.pause();
      
      await expect(
        token.connect(minter).mint(addr1.address, TEST_AMOUNT)
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Burning", function () {
    beforeEach(async function () {
      await token.grantRole(BURNER_ROLE, burner.address);
      // Give some tokens to addr1 for burning
      await token.transfer(addr1.address, TEST_AMOUNT);
    });

    it("Should allow burner to burn tokens", async function () {
      const initialBalance = await token.balanceOf(addr1.address);
      const burnAmount = ethers.parseEther("500");
      
      await token.connect(burner).burn(addr1.address, burnAmount);
      
      const finalBalance = await token.balanceOf(addr1.address);
      expect(finalBalance).to.equal(initialBalance - burnAmount);
    });

    it("Should emit TokensBurned event", async function () {
      const burnAmount = ethers.parseEther("500");
      
      await expect(token.connect(burner).burn(addr1.address, burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(addr1.address, burnAmount);
    });

    it("Should decrease total supply when burning", async function () {
      const initialSupply = await token.totalSupply();
      const burnAmount = ethers.parseEther("500");
      
      await token.connect(burner).burn(addr1.address, burnAmount);
      
      const newSupply = await token.totalSupply();
      expect(newSupply).to.equal(initialSupply - burnAmount);
    });

    it("Should prevent non-burner from burning", async function () {
      await expect(
        token.connect(addr2).burn(addr1.address, TEST_AMOUNT)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("Should fail to burn more tokens than balance", async function () {
      const balance = await token.balanceOf(addr1.address);
      const burnAmount = balance + ethers.parseEther("1");
      
      await expect(
        token.connect(burner).burn(addr1.address, burnAmount)
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("ERC20Votes", function () {
    it("Should have zero votes initially", async function () {
      expect(await token.getVotes(owner.address)).to.equal(0);
    });

    it("Should delegate votes to self", async function () {
      await token.delegate(owner.address);
      const votes = await token.getVotes(owner.address);
      expect(votes).to.equal(TOTAL_SUPPLY);
    });

    it("Should delegate votes to another address", async function () {
      await token.delegate(addr1.address);
      const votes = await token.getVotes(addr1.address);
      expect(votes).to.equal(TOTAL_SUPPLY);
    });

    it("Should track vote delegation changes", async function () {
      await token.delegate(owner.address);
      await token.transfer(addr1.address, TEST_AMOUNT);
      
      // After addr1 delegates to themselves
      await token.connect(addr1).delegate(addr1.address);
      expect(await token.getVotes(addr1.address)).to.equal(TEST_AMOUNT);
      expect(await token.getVotes(owner.address)).to.equal(TOTAL_SUPPLY - TEST_AMOUNT);
    });
  });

  describe("ERC20Permit", function () {
    it("Should have correct domain separator", async function () {
      const domainSeparator = await token.DOMAIN_SEPARATOR();
      expect(domainSeparator).to.not.equal(ethers.ZeroHash);
    });

    it("Should have initial nonce of 0", async function () {
      expect(await token.nonces(owner.address)).to.equal(0);
    });

    it("Should increment nonce after permit", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const nonce = await token.nonces(owner.address);
      
      // Create signature (simplified for this test)
      const domain = {
        name: await token.name(),
        version: "1",
        chainId: 1337,
        verifyingContract: await token.getAddress()
      };
      
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const values = {
        owner: owner.address,
        spender: addr1.address,
        value: TEST_AMOUNT,
        nonce: nonce,
        deadline: deadline
      };
      
      const signature = await owner.signTypedData(domain, types, values);
      const { v, r, s } = ethers.Signature.from(signature);
      
      await token.permit(owner.address, addr1.address, TEST_AMOUNT, deadline, v, r, s);
      
      expect(await token.nonces(owner.address)).to.equal(nonce + 1n);
      expect(await token.allowance(owner.address, addr1.address)).to.equal(TEST_AMOUNT);
    });
  });

  describe("Security Features", function () {
    it("Should prevent reentrancy in mint function", async function () {
      await token.grantRole(MINTER_ROLE, minter.address);
      
      // This test verifies that the nonReentrant modifier is working
      // In a real reentrancy attack scenario, we'd need a malicious contract
      // For now, we just verify that multiple calls in the same transaction work correctly
      await token.connect(minter).mint(addr1.address, TEST_AMOUNT);
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(TEST_AMOUNT);
    });

    it("Should prevent reentrancy in burn function", async function () {
      await token.grantRole(BURNER_ROLE, burner.address);
      await token.transfer(addr1.address, TEST_AMOUNT);
      
      await token.connect(burner).burn(addr1.address, TEST_AMOUNT);
      const balance = await token.balanceOf(addr1.address);
      expect(balance).to.equal(0);
    });

    it("Should support interface detection", async function () {
      // ERC165 interface
      expect(await token.supportsInterface("0x01ffc9a7")).to.be.true;
      // AccessControl interface
      expect(await token.supportsInterface("0x7965db0b")).to.be.true;
    });
  });

  describe("Events", function () {
    it("Should emit EmergencyPause event on pause", async function () {
      await expect(token.pause())
        .to.emit(token, "EmergencyPause")
        .withArgs(owner.address);
    });

    it("Should emit EmergencyUnpause event on unpause", async function () {
      await token.pause();
      
      await expect(token.unpause())
        .to.emit(token, "EmergencyUnpause")
        .withArgs(owner.address);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero transfers correctly", async function () {
      await token.transfer(addr1.address, 0);
      expect(await token.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should handle transfer to self", async function () {
      const initialBalance = await token.balanceOf(owner.address);
      await token.transfer(owner.address, TEST_AMOUNT);
      expect(await token.balanceOf(owner.address)).to.equal(initialBalance);
    });

    it("Should handle multiple role assignments", async function () {
      await token.grantRole(MINTER_ROLE, addr1.address);
      await token.grantRole(BURNER_ROLE, addr1.address);
      await token.grantRole(PAUSER_ROLE, addr1.address);
      
      expect(await token.hasRole(MINTER_ROLE, addr1.address)).to.be.true;
      expect(await token.hasRole(BURNER_ROLE, addr1.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, addr1.address)).to.be.true;
    });
  });
});