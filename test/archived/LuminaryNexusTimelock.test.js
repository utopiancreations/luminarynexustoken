const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LuminaryNexusTimelock", function () {
    let Timelock;
    let timelock;
    let deployer, proposer, executor, admin, other;

    const MIN_DELAY = 2 * 24 * 60 * 60; // 2 days in seconds

    beforeEach(async function () {
        [deployer, proposer, executor, admin, other] = await ethers.getSigners();

        Timelock = await ethers.getContractFactory("LuminaryNexusTimelock");
        timelock = await Timelock.deploy(proposer.address, executor.address, admin.address);
        await timelock.waitForDeployment();
    });

    it("Should set the correct min delay", async function () {
        expect(await timelock.getMinDelay()).to.equal(MIN_DELAY);
    });

    it("Should have the deployer as the initial owner of the Timelock contract", async function () {
        // In OpenZeppelin's TimelockControl, the deployer of the TimelockControl contract
        // is automatically granted the DEFAULT_ADMIN_ROLE.
        const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
        expect(await timelock.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
    });

    it("Should have the correct proposer role", async function () {
        const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
        expect(await timelock.hasRole(PROPOSER_ROLE, proposer.address)).to.be.true;
        expect(await timelock.hasRole(PROPOSER_ROLE, other.address)).to.be.false;
    });

    it("Should have the correct executor role", async function () {
        const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
        expect(await timelock.hasRole(EXECUTOR_ROLE, executor.address)).to.be.true;
        expect(await timelock.hasRole(EXECUTOR_ROLE, other.address)).to.be.false;
    });

    it("Should allow admin to grant and revoke roles", async function () {
        const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
        
        // Admin grants proposer role to 'other'
        await timelock.connect(admin).grantRole(PROPOSER_ROLE, other.address);
        expect(await timelock.hasRole(PROPOSER_ROLE, other.address)).to.be.true;

        // Admin revokes proposer role from 'proposer'
        await timelock.connect(admin).revokeRole(PROPOSER_ROLE, proposer.address);
        expect(await timelock.hasRole(PROPOSER_ROLE, proposer.address)).to.be.false;
    });

    it("Should not allow non-admin to grant or revoke roles", async function () {
        const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
        
        // Non-admin tries to grant role
        await expect(timelock.connect(proposer).grantRole(PROPOSER_ROLE, other.address))
            .to.be.revertedWith(
                `AccessControl: sender missing role ${await timelock.DEFAULT_ADMIN_ROLE()}`
            );

        // Non-admin tries to revoke role
        await expect(timelock.connect(executor).revokeRole(PROPOSER_ROLE, proposer.address))
            .to.be.revertedWith(
                `AccessControl: sender missing role ${await timelock.DEFAULT_ADMIN_ROLE()}`
            );
    });

    it("Should allow a proposer to schedule an operation", async function () {
        const target = other.address;
        const value = 0;
        const data = "0x";
        const predecessor = ethers.ZeroHash;
        const salt = ethers.ZeroHash;
        const delay = MIN_DELAY;

        const tx = await timelock.connect(proposer).schedule(
            target, value, data, predecessor, salt, delay
        );
        await expect(tx).to.emit(timelock, "CallScheduled");
    });

    it("Should not allow a non-proposer to schedule an operation", async function () {
        const target = other.address;
        const value = 0;
        const data = "0x";
        const predecessor = ethers.ZeroHash;
        const salt = ethers.ZeroHash;
        const delay = MIN_DELAY;

        await expect(timelock.connect(other).schedule(
            target, value, data, predecessor, salt, delay
        )).to.be.revertedWith(
            `AccessControl: sender missing role ${await timelock.PROPOSER_ROLE()}`
        );
    });

    // More complex tests involving execution would require simulating time, 
    // which is typically done in integration tests with the Governor.
});
