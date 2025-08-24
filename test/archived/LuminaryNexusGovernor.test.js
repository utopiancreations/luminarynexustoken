const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LuminaryNexusGovernor", function () {
    let lnxToken;
    let timelock;
    let governor;
    let deployer, proposer, executor, voter1, voter2, other;

    const MIN_DELAY = 2 * 24 * 60 * 60; // 2 days in seconds for Timelock
    const VOTING_DELAY = 1; // 1 block
    const VOTING_PERIOD = 45360; // Approximately 1 week in blocks
    const PROPOSAL_THRESHOLD = ethers.parseEther("100"); // 100 LNX
    const QUORUM_PERCENTAGE = 4; // 4%

    beforeEach(async function () {
        [deployer, proposer, executor, voter1, voter2, other] = await ethers.getSigners();

        // Deploy LNX Token
        const LNXToken = await ethers.getContractFactory("LuminaryNexusToken");
        // Mock router address is used for local testing, actual router on Polygon
        lnxToken = await LNXToken.deploy(deployer.address, deployer.address, deployer.address);
        await lnxToken.waitForDeployment();

        // Deploy Timelock
        const LuminaryNexusTimelock = await ethers.getContractFactory("LuminaryNexusTimelock");
        timelock = await LuminaryNexusTimelock.deploy(deployer.address, deployer.address, deployer.address);
        await timelock.waitForDeployment();

        // Deploy Governor
        const LuminaryNexusGovernor = await ethers.getContractFactory("LuminaryNexusGovernor");
        governor = await LuminaryNexusGovernor.deploy(await lnxToken.getAddress(), await timelock.getAddress());
        await governor.waitForDeployment();

        // Configure roles: Governor becomes proposer and executor on Timelock
        const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
        const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
        const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

        await timelock.connect(deployer).grantRole(PROPOSER_ROLE, await governor.getAddress());
        await timelock.connect(deployer).grantRole(EXECUTOR_ROLE, await governor.getAddress());
        await timelock.connect(deployer).revokeRole(ADMIN_ROLE, deployer.address); // Revoke deployer's admin role

        // Transfer LNX Token ownership to Governor
        await lnxToken.connect(deployer).transferOwnership(await governor.getAddress());

        // Distribute LNX tokens to voters and delegate voting power
        await lnxToken.connect(deployer).transfer(voter1.address, ethers.parseEther("10000"));
        await lnxToken.connect(deployer).transfer(voter2.address, ethers.parseEther("10000"));

        // Delegate voting power
        await lnxToken.connect(voter1).delegate(voter1.address);
        await lnxToken.connect(voter2).delegate(voter2.address);

        // Ensure enough blocks pass for delegation to be recorded
        await hre.network.provider.send("evm_mine");
        await hre.network.provider.send("evm_mine");
    });

    it("Should have the correct token and timelock addresses", async function () {
        expect(await governor.token()).to.equal(await lnxToken.getAddress());
        expect(await governor.timelock()).to.equal(await timelock.getAddress());
        // Cast the timelock address to TimelockController for interaction
        const timelockContract = await ethers.getContractAt("LuminaryNexusTimelock", await governor.timelock());
    });

    it("Should have the correct voting delay and period", async function () {
        expect(await governor.votingDelay()).to.equal(VOTING_DELAY);
        expect(await governor.votingPeriod()).to.equal(VOTING_PERIOD);
    });

    it("Should have the correct proposal threshold", async function () {
        expect(await governor.proposalThreshold()).to.equal(PROPOSAL_THRESHOLD);
    });

    it("Should allow a user to propose, vote, and execute a proposal", async function () {
        // Create a proposal to transfer LNX from governor to other address
        const transferAmount = ethers.parseEther("50");
        const encodedFunctionCall = lnxToken.interface.encodeFunctionData("transfer", [other.address, transferAmount]);

        const description = "Proposal #1: Transfer 50 LNX to other address";
        const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

        // Propose
        const proposeTx = await governor.connect(voter1).propose(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            description
        );
        const receipt = await proposeTx.wait();
        const proposalId = receipt.logs[0].args.proposalId; // Get proposalId from event

        // Check state: Pending
        expect(await governor.state(proposalId)).to.equal(0); // Pending

        // Fast forward blocks to pass voting delay
        for (let i = 0; i < VOTING_DELAY + 1; i++) {
            await hre.network.provider.send("evm_mine");
        }

        // Check state: Active
        expect(await governor.state(proposalId)).to.equal(1); // Active

        // Vote
        await governor.connect(voter1).castVote(proposalId, 1); // 1 for Against, 0 for For, 2 for Abstain
        await governor.connect(voter2).castVote(proposalId, 0); // Vote For

        // Fast forward blocks to pass voting period
        for (let i = 0; i < VOTING_PERIOD + 1; i++) {
            await hre.network.provider.send("evm_mine");
        }

        // Check state: Succeeded (assuming enough votes)
        expect(await governor.state(proposalId)).to.equal(4); // Succeeded

        // Queue the proposal
        await governor.queue(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            descriptionHash
        );

        // Fast forward time to pass timelock delay
        await hre.network.provider.send("evm_increaseTime", [MIN_DELAY + 1]);
        await hre.network.provider.send("evm_mine");

        // Check state: Queued
        expect(await governor.state(proposalId)).to.equal(5); // Queued

        // Execute the proposal
        const initialOtherBalance = await lnxToken.balanceOf(other.address);
        await governor.execute(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            descriptionHash
        );

        // Verify execution
        expect(await lnxToken.balanceOf(other.address)).to.equal(initialOtherBalance + transferAmount);
        expect(await governor.state(proposalId)).to.equal(7); // Executed
    });

    it("Should not allow proposal below threshold", async function () {
        const transferAmount = ethers.parseEther("1"); // Below threshold
        const encodedFunctionCall = lnxToken.interface.encodeFunctionData("transfer", [other.address, transferAmount]);
        const description = "Proposal #2: Transfer 1 LNX (below threshold)";

        await expect(governor.connect(voter1).propose(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            description
        )).to.be.revertedWith("Governor: proposer votes below proposal threshold");
    });

    it("Should not allow voting before voting delay passes", async function () {
        const transferAmount = ethers.parseEther("50");
        const encodedFunctionCall = lnxToken.interface.encodeFunctionData("transfer", [other.address, transferAmount]);
        const description = "Proposal #3: Vote too early";

        // Propose
        await governor.connect(voter1).propose(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            description
        );

        // Do not fast forward blocks

        await expect(governor.connect(voter1).castVote(ethers.toBigInt(0), 1)).to.be.revertedWith("Governor: vote not currently active");
    });

    it("Should not allow voting after voting period ends", async function () {
        const transferAmount = ethers.parseEther("50");
        const encodedFunctionCall = lnxToken.interface.encodeFunctionData("transfer", [other.address, transferAmount]);
        const description = "Proposal #4: Vote too late";

        const proposeTx = await governor.connect(voter1).propose(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            description
        );
        const receipt = await proposeTx.wait();
        const proposalId = receipt.logs[0].args.proposalId; // Get proposalId from event

        // Fast forward blocks to pass voting period
        for (let i = 0; i < VOTING_DELAY + VOTING_PERIOD + 1; i++) {
            await hre.network.provider.send("evm_mine");
        }

        await expect(governor.connect(voter1).castVote(proposalId, 1)).to.be.revertedWith("Governor: vote not currently active");
    });

    it("Should not allow execution before timelock delay passes", async function () {
        const transferAmount = ethers.parseEther("50");
        const encodedFunctionCall = lnxToken.interface.encodeFunctionData("transfer", [other.address, transferAmount]);
        const description = "Proposal #5: Execute too early";
        const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

        const proposeTx = await governor.connect(voter1).propose(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            description
        );
        const receipt = await proposeTx.wait();
        const proposalId = receipt.logs[0].args.proposalId; // Get proposalId from event

        // Fast forward blocks to pass voting period
        for (let i = 0; i < VOTING_DELAY + VOTING_PERIOD + 1; i++) {
            await hre.network.provider.send("evm_mine");
        }

        // Queue the proposal
        await governor.queue(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            descriptionHash
        );

        // Do not fast forward time to pass timelock delay

        await expect(governor.execute(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            descriptionHash
        )).to.be.revertedWith("TimelockController: operation is not ready");
    });

    it("Should not allow execution if proposal failed quorum", async function () {
        const transferAmount = ethers.parseEther("50");
        const encodedFunctionCall = lnxToken.interface.encodeFunctionData("transfer", [other.address, transferAmount]);
        const description = "Proposal #6: Failed quorum";
        const descriptionHash = ethers.keccak256(ethers.toUtf8Bytes(description));

        const proposeTx = await governor.connect(voter1).propose(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            description
        );
        const receipt = await proposeTx.wait();
        const proposalId = receipt.logs[0].args.proposalId; // Get proposalId from event

        // Fast forward blocks to pass voting delay
        for (let i = 0; i < VOTING_DELAY + 1; i++) {
            await hre.network.provider.send("evm_mine");
        }

        // Only one voter votes, not enough for 4% quorum (20000 LNX total delegated, 4% is 800 LNX)
        await governor.connect(voter1).castVote(proposalId, 0); // Vote For (10000 LNX)

        // Fast forward blocks to pass voting period
        for (let i = 0; i < VOTING_PERIOD + 1; i++) {
            await hre.network.provider.send("evm_mine");
        }

        expect(await governor.state(proposalId)).to.equal(3); // Defeated

        await expect(governor.queue(
            [await lnxToken.getAddress()],
            [0],
            [encodedFunctionCall],
            descriptionHash
        )).to.be.revertedWith("Governor: proposal not successful");
    });
});