const { expect } = require("chai");

describe("LuminaryNexusToken", function () {
  async function deployTokenFixture() {
    // Get the ContractFactory and Signers
    const [owner, treasury, addr1, addr2] = await ethers.getSigners();

    // Deploy the mock router
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router");
    const mockRouter = await MockRouter.deploy();

    // Deploy the token
    const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
    const lnxToken = await LuminaryNexusToken.deploy(
      owner.address,
      treasury.address,
      await mockRouter.getAddress()
    );

    return { lnxToken, mockRouter, owner, treasury, addr1, addr2 };
  }

  it("Should assign the total supply to the owner", async function () {
    const { lnxToken, owner } = await loadFixture(deployTokenFixture);
    const ownerBalance = await lnxToken.balanceOf(owner.address);
    expect(await lnxToken.totalSupply()).to.equal(ownerBalance);
  });

  it("Should set the right owner", async function () {
    const { lnxToken, owner } = await loadFixture(deployTokenFixture);
    expect(await lnxToken.owner()).to.equal(owner.address);
  });
});