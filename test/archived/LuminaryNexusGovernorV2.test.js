const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("LuminaryNexusGovernorV2", function () {
  let lnxToken, governor, timelock, reputation, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const LNXToken = await ethers.getContractFactory("LuminaryNexusToken");
    lnxToken = await LNXToken.deploy(owner.address);

    const Reputation = await ethers.getContractFactory("Reputation");
    reputation = await Reputation.deploy();

    const Timelock = await ethers.getContractFactory("LuminaryNexusTimelock");
    timelock = await Timelock.deploy(ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero);

    const Governor = await ethers.getContractFactory("LuminaryNexusGovernorV2");
    governor = await Governor.deploy(lnxToken.address, timelock.address, reputation.address);

    await lnxToken.delegate(owner.address);
  });

  it("Should correctly calculate quadratic voting power", async function () {
    await lnxToken.mint(addr1.address, 10000);
    await lnxToken.connect(addr1).delegate(addr1.address);

    const votes = await governor.getVotes(addr1.address, await ethers.provider.getBlockNumber());
    expect(votes).to.equal(100);
  });

  it("Should update the dynamic quorum after a vote", async function () {
    const initialQuorum = await governor.quorum(await ethers.provider.getBlockNumber());

    const proposalDescription = "Test Proposal";
    const targets = [lnxToken.address];
    const values = [0];
    const calldatas = [lnxToken.interface.encodeFunctionData("mint", [owner.address, 1])];

    const tx = await governor.propose(targets, values, calldatas, proposalDescription);
    const receipt = await tx.wait();
    const proposalId = receipt.events.find(e => e.event === 'ProposalCreated').args.proposalId;

    await time.increase(await governor.votingDelay());

    await governor.castVote(proposalId, 1);

    await time.increase(await governor.votingPeriod());

    await governor.execute(targets, values, calldatas, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(proposalDescription)));

    const newQuorum = await governor.quorum(await ethers.provider.getBlockNumber());

    expect(newQuorum).to.not.equal(initialQuorum);
  });
});