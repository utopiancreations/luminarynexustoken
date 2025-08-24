const { expect } = require("chai");
const hre = require("hardhat");

describe("LuminaryNexusDistribution", function () {
    let lnxToken;
    let distributionContract;
    let owner, daoTreasury, founder, airdropMechanism, deployer, addr1;

    const TOTAL_LNX_TO_DISTRIBUTE = 1_000_000_000n * (10n**18n); // 1 Billion LNX as BigInt

    // Allocation percentages in Basis Points (1% = 100 BPS, 10000 BPS = 100%)
    const TREASURY_BPS = 9425n;          // 94.25%
    const AIRDROP_BPS = 400n;            // 4.00%
    const FOUNDER_DIRECT_BPS = 100n;     // 1.00%
    const LIQUIDITY_LNX_PORTION_BPS = 75n; // 0.75%

    beforeEach(async function () {
        [deployer, owner, daoTreasury, founder, airdropMechanism, addr1] = await hre.ethers.getSigners();

        // Deploy a mock router for LNXToken constructor
        const MockRouter = await hre.ethers.getContractFactory("MockUniswapV2Router");
        const mockRouter = await MockRouter.deploy();
        await mockRouter.waitForDeployment();
        const mockRouterAddress = await mockRouter.getAddress();

        // Deploy the LNX token contract
        const LNXToken = await hre.ethers.getContractFactory("LuminaryNexusToken");
        lnxToken = await LNXToken.deploy(
            owner.address, // _initialOwner
            daoTreasury.address, // _communityTreasury
            mockRouterAddress // _routerAddress
        );
        await lnxToken.waitForDeployment();

        // Exclude the LNX token owner from fees for the initial transfer to distribution contract
        // This is crucial because LNXToken has transfer fees, and the owner needs to transfer
        // the full initial supply to the distribution contract without fees being taken.
        await lnxToken.connect(owner).excludeFromFee(owner.address, true);

        // Deploy the Distribution contract
        const LuminaryNexusDistribution = await hre.ethers.getContractFactory("LuminaryNexusDistribution");
        distributionContract = await LuminaryNexusDistribution.deploy(
            await lnxToken.getAddress(),
            daoTreasury.address,
            founder.address,
            airdropMechanism.address,
            deployer.address // Owner of this distribution contract
        );
        await distributionContract.waitForDeployment();

        // Transfer the total supply from the LNX token owner to the distribution contract
        // The LNXToken constructor mints total supply to its initial owner (which is `owner` here)
        console.log(`Owner's balance before transfer to distribution: ${await lnxToken.balanceOf(owner.address)}`);
        await lnxToken.connect(owner).transfer(
            await distributionContract.getAddress(),
            TOTAL_LNX_TO_DISTRIBUTE
        );
    });

    it("Should have the correct initial state", async function () {
        expect(await distributionContract.lnxToken()).to.equal(await lnxToken.getAddress());
        expect(await distributionContract.daoTreasuryAddress()).to.equal(daoTreasury.address);
        expect(await distributionContract.founderAddress()).to.equal(founder.address);
        expect(await distributionContract.airdropMechanismAddress()).to.equal(airdropMechanism.address);
        expect(await distributionContract.hasDistributed()).to.be.false;
        expect(await lnxToken.balanceOf(await distributionContract.getAddress())).to.equal(TOTAL_LNX_TO_DISTRIBUTE);
    });

    it("Should execute the initial distribution correctly", async function () {
        // Calculate expected amounts
        const expectedTreasuryAmount = (TOTAL_LNX_TO_DISTRIBUTE * TREASURY_BPS) / 10000n;
        const expectedAirdropAmount = (TOTAL_LNX_TO_DISTRIBUTE * AIRDROP_BPS) / 10000n;
        const expectedFounderDirectAmount = (TOTAL_LNX_TO_DISTRIBUTE * FOUNDER_DIRECT_BPS) / 10000n;
        const expectedLiquidityLnxPortionAmount = (TOTAL_LNX_TO_DISTRIBUTE * LIQUIDITY_LNX_PORTION_BPS) / 10000n;

        // Execute distribution
        await distributionContract.connect(deployer).executeInitialDistribution();

        // Verify balances
        expect(await lnxToken.balanceOf(daoTreasury.address)).to.equal(expectedTreasuryAmount);
        expect(await lnxToken.balanceOf(airdropMechanism.address)).to.equal(expectedAirdropAmount);
        // Founder receives both direct and liquidity portion
        expect(await lnxToken.balanceOf(founder.address)).to.equal(expectedFounderDirectAmount + expectedLiquidityLnxPortionAmount);

        // Verify that the distribution contract's balance is now zero (or very close due to rounding)
        expect(await lnxToken.balanceOf(await distributionContract.getAddress())).to.be.closeTo(0n, 1n); // Allow for 1 wei difference

        // Verify distributedAmounts mapping
        expect(await distributionContract.distributedAmounts("treasury")).to.equal(expectedTreasuryAmount);
        expect(await distributionContract.distributedAmounts("airdrop")).to.equal(expectedAirdropAmount);
        expect(await distributionContract.distributedAmounts("founderDirect")).to.equal(expectedFounderDirectAmount);
        expect(await distributionContract.distributedAmounts("liquidityLNXPortion")).to.equal(expectedLiquidityLnxPortionAmount);
    });

    it("Should not allow distribution to be executed more than once", async function () {
        await distributionContract.connect(deployer).executeInitialDistribution();
        await expect(distributionContract.connect(deployer).executeInitialDistribution()).to.be.revertedWith("Distribute: Already executed.");
    });

    it("Should not allow non-owner to execute distribution", async function () {
        // OpenZeppelin's Ownable contract reverts with "Ownable: caller is not the owner"
        await expect(distributionContract.connect(owner).executeInitialDistribution()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should revert if insufficient LNX in contract", async function () {
        // Transfer out some LNX to make it insufficient
        // First, ensure the owner of LNX token is not excluded from fees for this specific test
        await lnxToken.connect(owner).excludeFromFee(owner.address, false);
        await lnxToken.connect(owner).transfer(
            owner.address, // Send back to owner
            hre.ethers.parseEther("100000000") // 100 million LNX
        );
        // Now the distribution contract has less than TOTAL_LNX_TO_DISTRIBUTE
        await expect(distributionContract.connect(deployer).executeInitialDistribution()).to.be.revertedWith("Distribute: Insufficient LNX in contract.");
    });

    it("Should allow owner to recover non-LNX ERC20 tokens", async function () {
        // Deploy a dummy ERC20 token
        const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
        const mockERC20 = await MockERC20.deploy("Mock Token", "MTK", hre.ethers.parseEther("10000"));
        await mockERC20.waitForDeployment();
        const mockERC20Address = await mockERC20.getAddress();

        // Transfer some dummy tokens to the distribution contract
        await mockERC20.connect(owner).transfer(await distributionContract.getAddress(), hre.ethers.parseEther("100"));

        const initialRecipientBalance = await mockERC20.balanceOf(airdropMechanism.address);
        const amountToRecover = hre.ethers.parseEther("50");

        await distributionContract.connect(deployer).recoverNonLnxERC20(
            mockERC20Address,
            airdropMechanism.address,
            amountToRecover
        );

        expect(await mockERC20.balanceOf(airdropMechanism.address)).to.equal(initialRecipientBalance + amountToRecover);
        expect(await mockERC20.balanceOf(await distributionContract.getAddress())).to.equal(hre.ethers.parseEther("50"));
    });

    it("Should not allow recovering LNX tokens via recoverNonLnxERC20", async function () {
        await expect(distributionContract.connect(deployer).recoverNonLnxERC20(
            await lnxToken.getAddress(),
            owner.address,
            hre.ethers.parseEther("100")
        )).to.be.revertedWith("Distribute: Cannot recover LNX via this function.");
    });
});
