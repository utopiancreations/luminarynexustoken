const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Luminary Nexus Governance System", function () {
    async function deployGovernanceFixture() {
        const [owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9] = await ethers.getSigners();

        // Deploy LuminaryNexusToken with owner parameter
        const LuminaryNexusToken = await ethers.getContractFactory("LuminaryNexusToken");
        const token = await LuminaryNexusToken.deploy(owner.address);

        // Deploy Reputation contract
        const Reputation = await ethers.getContractFactory("Reputation");
        const reputation = await Reputation.deploy();

        // Deploy Timelock
        const LuminaryNexusTimelock = await ethers.getContractFactory("LuminaryNexusTimelock");
        const proposers = [];
        const executors = [];
        const timelock = await LuminaryNexusTimelock.deploy(proposers, executors, owner.address);

        // Deploy Governor
        const LuminaryNexusGovernorV2 = await ethers.getContractFactory("LuminaryNexusGovernorV2");
        const governor = await LuminaryNexusGovernorV2.deploy(
            await token.getAddress(),
            await timelock.getAddress(),
            await reputation.getAddress()
        );

        // Set up roles - Governor should be proposer and executor
        const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
        const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
        const DEFAULT_ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();

        await timelock.grantRole(PROPOSER_ROLE, await governor.getAddress());
        await timelock.grantRole(EXECUTOR_ROLE, await governor.getAddress());

        // Give tokens to many test addresses to meet quorum
        const addresses = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9];
        const amount = ethers.parseEther("500000"); // 500k tokens each
        
        for (const addr of addresses) {
            await token.mint(addr.address, amount);
            await token.connect(addr).delegate(addr.address);
        }

        return { token, reputation, timelock, governor, owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9 };
    }

    describe("Deployment", function () {
        it("Should deploy all contracts successfully", async function () {
            const { token, reputation, timelock, governor } = await loadFixture(deployGovernanceFixture);

            expect(await token.name()).to.equal("Luminary Nexus Token");
            expect(await governor.name()).to.equal("LuminaryNexusGovernorV2");
            expect(await timelock.getMinDelay()).to.equal(172800); // 2 days
        });

        it("Should set up roles correctly", async function () {
            const { timelock, governor } = await loadFixture(deployGovernanceFixture);

            const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
            const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();

            expect(await timelock.hasRole(PROPOSER_ROLE, await governor.getAddress())).to.be.true;
            expect(await timelock.hasRole(EXECUTOR_ROLE, await governor.getAddress())).to.be.true;
        });

        it("Should have correct governance parameters", async function () {
            const { governor } = await loadFixture(deployGovernanceFixture);

            expect(await governor.votingDelay()).to.equal(6480); // 1 day
            expect(await governor.votingPeriod()).to.equal(45360); // 1 week
            expect(await governor.proposalThreshold()).to.equal(0);
        });
    });

    describe("Voting Power Calculations", function () {
        it("Should calculate quadratic voting correctly", async function () {
            const { governor, addr1, token } = await loadFixture(deployGovernanceFixture);

            // addr1 has 500k tokens, with quadratic voting should be sqrt(500000) = ~707
            const votingPower = await governor.getVotes(addr1.address, await ethers.provider.getBlockNumber() - 1);
            expect(votingPower).to.be.closeTo(707n, 10n); // Allow some rounding difference
        });

        it("Should include reputation in voting power", async function () {
            const { governor, reputation, addr1 } = await loadFixture(deployGovernanceFixture);

            // Set reputation to 50 (should give 150% multiplier)
            await reputation.setReputation(addr1.address, 50);

            // Current block might not have the reputation yet, so let's mine a block
            await ethers.provider.send("evm_mine");

            const details = await governor.getAccountVotingDetails(addr1.address, await ethers.provider.getBlockNumber() - 1);
            expect(details.reputation).to.equal(50);
            expect(details.finalVotes).to.be.greaterThan(details.quadraticVotes);
        });

        it("Should return zero voting power for accounts without tokens", async function () {
            const { governor } = await loadFixture(deployGovernanceFixture);

            // Create new account with no tokens (use a random wallet)
            const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
            const votingPower = await governor.getVotes(newWallet.address, await ethers.provider.getBlockNumber() - 1);
            expect(votingPower).to.equal(0);
        });
    });

    describe("Proposal Lifecycle", function () {
        it("Should create a proposal", async function () {
            const { governor, token, addr1 } = await loadFixture(deployGovernanceFixture);

            // Create a simple proposal to transfer tokens
            const targets = [await token.getAddress()];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("transfer", [addr1.address, ethers.parseEther("100")])];
            const description = "Test Proposal: Transfer 100 tokens";

            const proposalTx = await governor.connect(addr1).propose(targets, values, calldatas, description);
            const receipt = await proposalTx.wait();

            // Extract proposal ID from event
            const proposalCreatedEvent = receipt.logs.find(log => {
                try {
                    return governor.interface.parseLog(log).name === 'ProposalCreated';
                } catch (e) {
                    return false;
                }
            });

            expect(proposalCreatedEvent).to.not.be.undefined;
            const parsedEvent = governor.interface.parseLog(proposalCreatedEvent);
            expect(parsedEvent.args.proposer).to.equal(addr1.address);
        });

        it("Should allow voting on proposals", async function () {
            const { governor, token, addr1, addr2 } = await loadFixture(deployGovernanceFixture);

            // Create proposal
            const targets = [await token.getAddress()];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("transfer", [addr1.address, ethers.parseEther("100")])];
            const description = "Test Proposal: Transfer 100 tokens";

            const proposalTx = await governor.connect(addr1).propose(targets, values, calldatas, description);
            const receipt = await proposalTx.wait();
            const proposalCreatedEvent = receipt.logs.find(log => {
                try {
                    return governor.interface.parseLog(log).name === 'ProposalCreated';
                } catch (e) {
                    return false;
                }
            });
            const proposalId = governor.interface.parseLog(proposalCreatedEvent).args.proposalId;

            // Check initial state - should be Pending (0)
            expect(await governor.state(proposalId)).to.equal(0);

            // Mine blocks to simulate time passing for voting delay
            const votingDelay = await governor.votingDelay();
            for (let i = 0; i < Number(votingDelay) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Check state is now Active (1)
            const currentState = await governor.state(proposalId);
            expect(currentState).to.equal(1);

            // Vote on proposal (1 = For, 0 = Against, 2 = Abstain)
            await governor.connect(addr1).castVote(proposalId, 1);
            await governor.connect(addr2).castVote(proposalId, 1);

            const votes = await governor.proposalVotes(proposalId);
            expect(votes.forVotes).to.be.greaterThan(0);
            expect(votes.againstVotes).to.equal(0);
        });

        it("Should calculate quorum correctly", async function () {
            const { governor, token } = await loadFixture(deployGovernanceFixture);

            const currentBlock = await ethers.provider.getBlockNumber();
            const quorum = await governor.quorum(currentBlock - 1);
            const totalSupply = await token.totalSupply();

            // New quorum should be 4% of theoretical max quadratic voting power
            // Theoretical max is sqrt(totalSupply in wei)
            const totalSupplyNumber = Number(totalSupply);
            const theoreticalMax = Math.floor(Math.sqrt(totalSupplyNumber));
            const expectedQuorumApprox = Math.floor(theoreticalMax * 0.04);
            
            const quorumNum = Number(quorum);
            console.log('Actual quorum:', quorumNum);
            console.log('Expected quorum:', expectedQuorumApprox);
            expect(quorumNum).to.be.closeTo(expectedQuorumApprox, expectedQuorumApprox * 0.1); // Allow 10% variance
        });
    });

    describe("Timelock Integration", function () {
        it("Should queue successful proposals", async function () {
            const { governor, token, timelock, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9 } = await loadFixture(deployGovernanceFixture);

            // Create proposal
            const targets = [await token.getAddress()];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("mint", [addr1.address, ethers.parseEther("100")])];
            const description = "Test Proposal: Mint 100 tokens";

            const proposalTx = await governor.connect(addr1).propose(targets, values, calldatas, description);
            const receipt = await proposalTx.wait();
            const proposalCreatedEvent = receipt.logs.find(log => {
                try {
                    return governor.interface.parseLog(log).name === 'ProposalCreated';
                } catch (e) {
                    return false;
                }
            });
            const proposalId = governor.interface.parseLog(proposalCreatedEvent).args.proposalId;

            // Wait for voting delay and vote
            const votingDelay = await governor.votingDelay();
            for (let i = 0; i < Number(votingDelay) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }
            // Vote with many addresses to meet quorum
            const voters = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9];
            for (const voter of voters) {
                await governor.connect(voter).castVote(proposalId, 1);
            }

            // Wait for voting period to end
            const votingPeriod = await governor.votingPeriod();
            for (let i = 0; i < Number(votingPeriod) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Check that proposal succeeded
            expect(await governor.state(proposalId)).to.equal(4); // Succeeded

            // Queue the proposal
            await governor.queue(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // Check that proposal is queued
            expect(await governor.state(proposalId)).to.equal(5); // Queued
        });

        it("Should execute queued proposals after timelock delay", async function () {
            const { governor, token, timelock, owner, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9 } = await loadFixture(deployGovernanceFixture);

            const initialBalance = await token.balanceOf(addr1.address);

            // Create proposal
            const targets = [await token.getAddress()];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("mint", [addr1.address, ethers.parseEther("100")])];
            const description = "Test Proposal: Mint 100 tokens";

            const proposalTx = await governor.connect(addr1).propose(targets, values, calldatas, description);
            const receipt = await proposalTx.wait();
            const proposalCreatedEvent = receipt.logs.find(log => {
                try {
                    return governor.interface.parseLog(log).name === 'ProposalCreated';
                } catch (e) {
                    return false;
                }
            });
            const proposalId = governor.interface.parseLog(proposalCreatedEvent).args.proposalId;

            // Wait for voting delay and vote
            const votingDelay = await governor.votingDelay();
            for (let i = 0; i < Number(votingDelay) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }
            // Vote with many addresses to meet quorum
            const voters = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9];
            for (const voter of voters) {
                await governor.connect(voter).castVote(proposalId, 1);
            }

            // Wait for voting period to end
            const votingPeriod = await governor.votingPeriod();
            for (let i = 0; i < Number(votingPeriod) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Queue the proposal
            await governor.queue(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // Wait for timelock delay (2 days)
            await time.increase(172801);

            // Grant minter role to timelock so it can execute mint
            const MINTER_ROLE = await token.MINTER_ROLE();
            await token.connect(owner).grantRole(MINTER_ROLE, await timelock.getAddress());

            // Execute the proposal
            await governor.execute(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // Check that proposal was executed
            expect(await governor.state(proposalId)).to.equal(7); // Executed

            // Check that tokens were minted
            const finalBalance = await token.balanceOf(addr1.address);
            expect(finalBalance).to.equal(initialBalance + ethers.parseEther("100"));
        });
    });

    describe("Security Features", function () {
        it("Should reject proposals from accounts without proposer role in timelock", async function () {
            const { governor, token, timelock, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9 } = await loadFixture(deployGovernanceFixture);

            const targets = [await token.getAddress()];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("transfer", [addr1.address, ethers.parseEther("100")])];
            const description = "Test Proposal: Should fail on queue";

            // Create proposal (this should work)
            const proposalTx = await governor.connect(addr1).propose(targets, values, calldatas, description);
            const receipt = await proposalTx.wait();
            const proposalCreatedEvent = receipt.logs.find(log => {
                try {
                    return governor.interface.parseLog(log).name === 'ProposalCreated';
                } catch (e) {
                    return false;
                }
            });
            const proposalId = governor.interface.parseLog(proposalCreatedEvent).args.proposalId;

            // Wait for voting delay and vote to make it succeed
            const votingDelay = await governor.votingDelay();
            for (let i = 0; i < Number(votingDelay) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }
            
            const voters = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9];
            for (const voter of voters) {
                await governor.connect(voter).castVote(proposalId, 1);
            }

            const votingPeriod = await governor.votingPeriod();
            for (let i = 0; i < Number(votingPeriod) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Remove proposer role from governor
            const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
            await timelock.revokeRole(PROPOSER_ROLE, await governor.getAddress());

            // Try to queue (this should fail with access control error)
            await expect(
                governor.queue(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)))
            ).to.be.revertedWithCustomError(timelock, "AccessControlUnauthorizedAccount");
        });

        it("Should prevent execution before timelock delay", async function () {
            const { governor, token, addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9 } = await loadFixture(deployGovernanceFixture);

            // Create and pass a proposal
            const targets = [await token.getAddress()];
            const values = [0];
            const calldatas = [token.interface.encodeFunctionData("mint", [addr1.address, ethers.parseEther("100")])];
            const description = "Test Proposal: Early execution";

            const proposalTx = await governor.connect(addr1).propose(targets, values, calldatas, description);
            const receipt = await proposalTx.wait();
            const proposalCreatedEvent = receipt.logs.find(log => {
                try {
                    return governor.interface.parseLog(log).name === 'ProposalCreated';
                } catch (e) {
                    return false;
                }
            });

            const votingDelayLocal = await governor.votingDelay();
            for (let i = 0; i < Number(votingDelayLocal) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }
            
            // Vote with many addresses to meet quorum
            const voters = [addr1, addr2, addr3, addr4, addr5, addr6, addr7, addr8, addr9];
            const proposalId = governor.interface.parseLog(proposalCreatedEvent).args.proposalId;
            for (const voter of voters) {
                await governor.connect(voter).castVote(proposalId, 1);
            }

            const votingPeriodLocal = await governor.votingPeriod();
            for (let i = 0; i < Number(votingPeriodLocal) + 1; i++) {
                await ethers.provider.send("evm_mine");
            }

            // Queue the proposal
            await governor.queue(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)));

            // Try to execute immediately (should fail)
            await expect(
                governor.execute(targets, values, calldatas, ethers.keccak256(ethers.toUtf8Bytes(description)))
            ).to.be.reverted;
        });
    });

    describe("Governance Utilities", function () {
        it("Should return correct governance parameters", async function () {
            const { governor } = await loadFixture(deployGovernanceFixture);

            const params = await governor.getGovernanceParameters();
            expect(params.votingDelay_).to.equal(6480);
            expect(params.votingPeriod_).to.equal(45360);
            expect(params.proposalThreshold_).to.equal(0);
            expect(params.quorumNumerator_).to.equal(4);
        });

        it("Should return detailed voting information", async function () {
            const { governor, reputation, addr1 } = await loadFixture(deployGovernanceFixture);

            await reputation.setReputation(addr1.address, 25);
            await ethers.provider.send("evm_mine");

            const details = await governor.getAccountVotingDetails(addr1.address, await ethers.provider.getBlockNumber() - 1);
            
            expect(details.baseVotes).to.be.greaterThan(0);
            expect(details.quadraticVotes).to.be.greaterThan(0);
            expect(details.reputation).to.equal(25);
            expect(details.finalVotes).to.be.greaterThan(details.quadraticVotes);
        });
    });

    describe("Edge Cases", function () {
        it("Should handle proposals with zero voting power gracefully", async function () {
            const { governor, token } = await loadFixture(deployGovernanceFixture);

            // Create account with no tokens using random wallet
            const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
            
            const votingPower = await governor.getVotes(newWallet.address, await ethers.provider.getBlockNumber() - 1);
            expect(votingPower).to.equal(0);

            const details = await governor.getAccountVotingDetails(newWallet.address, await ethers.provider.getBlockNumber() - 1);
            expect(details.baseVotes).to.equal(0);
            expect(details.finalVotes).to.equal(0);
        });

        it("Should handle reputation system integration correctly", async function () {
            const { governor, reputation, addr1 } = await loadFixture(deployGovernanceFixture);

            // Test with maximum reputation (100)
            await reputation.setReputation(addr1.address, 100);
            await ethers.provider.send("evm_mine");

            const details = await governor.getAccountVotingDetails(addr1.address, await ethers.provider.getBlockNumber() - 1);
            
            // With 100 reputation, multiplier should be 200%
            const expectedFinalVotes = (details.quadraticVotes * 200n) / 100n;
            expect(details.finalVotes).to.equal(expectedFinalVotes);
        });
    });
});
