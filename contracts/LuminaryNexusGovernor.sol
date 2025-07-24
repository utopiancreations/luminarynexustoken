// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/IGovernor.sol";
import "@openzeppelin/contracts/governance/ITimelock.sol"; // This is needed for the timelock() return type
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol"; // Import the concrete TimelockController

/**
 * @title Luminary Nexus Governor Contract
 * @dev This contract implements the core governance logic for the Luminary Nexus DAO.
 * It extends OpenZeppelin's Governor, providing functionality for proposal creation,
 * voting, and execution. It integrates with a Timelock contract for delayed execution
 * and uses ERC20Votes for voting power based on LNX token holdings.
 */
contract LuminaryNexusGovernor is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    // The LNX token contract instance (expected to be ERC20Votes compatible)
    ERC20Votes public immutable lnxToken;

    /**
     * @dev Constructor for the Luminary Nexus Governor contract.
     * @param _lnxTokenAddress The address of the deployed LuminaryNexusToken contract.
     * @param _timelock The address of the deployed TimelockController contract.
     */
    constructor(ERC20Votes _lnxTokenAddress, TimelockController _timelock)
        Governor("Luminary Nexus DAO Governor") // Governor constructor takes only name
        GovernorVotes(address(_lnxTokenAddress)) // GovernorVotes takes address of IVotes token
        GovernorVotesQuorumFraction(4) // 4% quorum, adjustable by governance
        GovernorTimelockControl(address(_timelock)) // GovernorTimelockControl takes address of TimelockController
    {
        require(address(_lnxTokenAddress) != address(0), "Governor: LNX token zero address");
        require(address(_timelock) != address(0), "Governor: Timelock zero address");
        lnxToken = _lnxTokenAddress;
    }

    /**
     * @dev Returns the address of the voting token (LNX).
     * Overrides GovernorVotes.token() which returns IERC5805.
     */
    function token() public view override(IGovernor, GovernorVotes) returns (IERC5805) {
        return lnxToken;
    }

    /**
     * @dev Returns the address of the timelock controller.
     * Overrides GovernorTimelockControl.timelock() which returns ITimelock.
     */
    function timelock() public view override(IGovernor, GovernorTimelockControl) returns (ITimelock) {
        return ITimelock(GovernorTimelockControl.timelock());
    }

    /**
     * @dev Returns the voting quorum fraction.
     */
    function quorum(uint256 blockNumber) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
        return super.quorum(blockNumber);
    }

    /**
     * @dev Returns the voting period in blocks.
     * @return The voting period in blocks (e.g., 1 week = ~45360 blocks on Polygon).
     */
    function votingPeriod() public view override(Governor, GovernorCountingSimple) returns (uint256) {
        return 45360; // Approximately 1 week on Polygon (assuming ~1.5s block time)
    }

    /**
     * @dev Returns the voting delay in blocks.
     * @return The voting delay in blocks (e.g., 1 day = ~6480 blocks on Polygon).
     */
    function votingDelay() public view override(Governor, GovernorCountingSimple) returns (uint256) {
        return 6480; // Approximately 1 day on Polygon
    }

    // The following functions are overrides required by Solidity.
    // These functions are part of the Governor base contract and its extensions.

    function state(uint256 proposalId) public view override(Governor, GovernorTimelockControl) returns (ProposalState) {
        return super.state(proposalId);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public override(Governor, GovernorTimelockControl) returns (uint256) {
        return super.propose(targets, values, calldatas, description);
    }

    function _execute(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._execute(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _castVote(
        uint256 proposalId,
        uint256 support,
        string memory reason
    ) internal override(Governor, GovernorCountingSimple) {
        super._castVote(proposalId, support, reason);
    }

    function _castVoteBySig(
        uint256 proposalId,
        uint256 support,
        string memory reason,
        bytes memory signature
    ) internal override(Governor, GovernorCountingSimple) {
        super._castVoteBySig(proposalId, support, reason, signature);
    }

    function getVotes(address account, uint256 blockNumber) public view override(Governor, GovernorVotes) returns (uint256) {
        return super.getVotes(account, blockNumber);
    }

    function hasVoted(uint256 proposalId, address voter) public view override(Governor, GovernorCountingSimple) returns (bool) {
        return super.hasVoted(proposalId, voter);
    }

    function proposalThreshold() public view override(Governor, GovernorVotes) returns (uint256) {
        // For simplicity, let's set a small threshold for now (e.g., 100 LNX tokens)
        // This can be adjusted by governance later.
        return 100 * (10**18);
    }

    function _setVotingDelay(uint256 newVotingDelay) internal override(Governor, GovernorCountingSimple) {
        super._setVotingDelay(newVotingDelay);
    }

    function _setVotingPeriod(uint256 newVotingPeriod) internal override(Governor, GovernorCountingSimple) {
        super._setVotingPeriod(newVotingPeriod);
    }

    function _setProposalThreshold(uint256 newProposalThreshold) internal override(Governor, GovernorVotes) {
        super._setProposalThreshold(newProposalThreshold);
    }

    function _setQuorumNumerator(uint256 newQuorumNumerator) internal override(Governor, GovernorVotesQuorumFraction) {
        super._setQuorumNumerator(newQuorumNumerator);
    }

    // Required overrides for GovernorTimelockControl
    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view virtual override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal virtual override(Governor, GovernorTimelockControl) {
        super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function proposalNeedsQueuing(uint256 proposalId) public view virtual override(Governor, GovernorTimelockControl) returns (bool) {
        return super.proposalNeedsQueuing(proposalId);
    }
}