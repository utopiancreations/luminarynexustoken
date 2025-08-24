// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "./Reputation.sol";

/**
 * @title Luminary Nexus Governor V2
 * @dev Enhanced governance contract for the Luminary Nexus DAO with quadratic voting
 * based on token holdings and reputation system integration.
 * 
 * Updated for OpenZeppelin v5 compatibility.
 * @custom:version 2.0.0
 */
contract LuminaryNexusGovernorV2 is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    Reputation public immutable reputationContract;
    ERC20Votes public immutable lnxToken;
    uint256 public lastQuorum;

    // Custom events
    event QuorumUpdated(uint256 newQuorum, uint256 blockNumber);
    event ProposalExecutedWithMetrics(
        uint256 indexed proposalId,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes
    );

    constructor(
        ERC20Votes _lnxToken,
        TimelockController _timelock,
        Reputation _reputationContract
    )
        Governor("LuminaryNexusGovernorV2")
        GovernorVotes(_lnxToken)
        GovernorVotesQuorumFraction(4) // 4% quorum
        GovernorTimelockControl(_timelock)
    {
        require(address(_lnxToken) != address(0), "Governor: LNX token cannot be zero address");
        require(address(_timelock) != address(0), "Governor: Timelock cannot be zero address");
        require(address(_reputationContract) != address(0), "Governor: Reputation contract cannot be zero address");
        
        reputationContract = _reputationContract;
        lnxToken = _lnxToken;
    }

    // Voting parameters
    function votingDelay() public pure override returns (uint256) {
        return 6480; // 1 day (assuming 13.2 second blocks)
    }

    function votingPeriod() public pure override returns (uint256) {
        return 45360; // 1 week (assuming 13.2 second blocks)
    }

    function proposalThreshold() public pure override returns (uint256) {
        return 0; // No minimum tokens required to propose
    }

    /**
     * @dev Enhanced voting power calculation with quadratic voting and reputation boost
     * @param account The address to get voting power for
     * @param timepoint The timepoint to get voting power at (block number)
     * @return The calculated voting power
     */
    function getVotes(address account, uint256 timepoint) public view override returns (uint256) {
        uint256 baseVotes = super.getVotes(account, timepoint);
        if (baseVotes == 0) return 0;
        
        // Convert from wei to token units for quadratic calculation
        // This prevents extremely large numbers
        uint256 tokenAmount = baseVotes / 1e18;
        if (tokenAmount == 0 && baseVotes > 0) tokenAmount = 1; // Minimum 1 for small balances
        
        // Get reputation score (0-100 scale)
        uint256 reputation = reputationContract.reputation(account);
        
        // Apply quadratic voting: sqrt(tokens) * (1 + reputation/100)
        uint256 quadraticVotes = sqrt(tokenAmount);
        uint256 reputationMultiplier = 100 + reputation; // 100-200 range
        
        return (quadraticVotes * reputationMultiplier) / 100;
    }

    /**
     * @dev Custom quorum calculation based on quadratic voting system
     * @param timepoint The timepoint to calculate quorum for
     * @return The required quorum for proposals
     */
    function quorum(uint256 timepoint) public view override(Governor, GovernorVotesQuorumFraction) returns (uint256) {
        uint256 totalSupply = lnxToken.getPastTotalSupply(timepoint);
        
        // Calculate theoretical maximum quadratic voting power
        // This assumes equal distribution, which gives us a reasonable baseline
        uint256 theoreticalMaxVotingPower = sqrt(totalSupply);
        
        if (lastQuorum == 0) {
            // For first proposal, use 4% of theoretical max voting power
            return (theoreticalMaxVotingPower * 4) / 100;
        }
        
        // Dynamic quorum based on last participation
        // Calculate as percentage of theoretical maximum voting power
        uint256 dynamicQuorum = (lastQuorum * theoreticalMaxVotingPower) / 
                               sqrt(lnxToken.getPastTotalSupply(block.number - 1));
        
        uint256 minQuorum = (theoreticalMaxVotingPower * 2) / 100; // 2% minimum
        uint256 maxQuorum = (theoreticalMaxVotingPower * 15) / 100; // 15% maximum
        
        if (dynamicQuorum < minQuorum) return minQuorum;
        if (dynamicQuorum > maxQuorum) return maxQuorum;
        return dynamicQuorum;
    }

    // Required overrides for multiple inheritance
    function state(uint256 proposalId) 
        public 
        view 
        override(Governor, GovernorTimelockControl) 
        returns (ProposalState) 
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
        
        // Update quorum tracking after execution
        (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) = proposalVotes(proposalId);
        lastQuorum = forVotes + againstVotes + abstainVotes;
        
        emit ProposalExecutedWithMetrics(proposalId, forVotes, againstVotes, abstainVotes);
        emit QuorumUpdated(lastQuorum, block.number);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    // Clock mode for voting timing
    function CLOCK_MODE() public pure override(Governor, GovernorVotes) returns (string memory) {
        return "mode=blocknumber&from=default";
    }

    function clock() public view override(Governor, GovernorVotes) returns (uint48) {
        return uint48(block.number);
    }

    /**
     * @dev Square root function for quadratic voting calculation
     * @param x The number to calculate square root for
     * @return y The square root result
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /**
     * @dev Get current governance parameters
     * @return votingDelay_ Current voting delay
     * @return votingPeriod_ Current voting period  
     * @return proposalThreshold_ Current proposal threshold
     * @return quorumNumerator_ Current quorum numerator
     */
    function getGovernanceParameters() 
        external 
        view 
        returns (
            uint256 votingDelay_,
            uint256 votingPeriod_,
            uint256 proposalThreshold_,
            uint256 quorumNumerator_
        ) 
    {
        return (
            votingDelay(),
            votingPeriod(),
            proposalThreshold(),
            quorumNumerator()
        );
    }

    /**
     * @dev Get detailed voting information for an account
     * @param account The account to check
     * @param timepoint The timepoint to check at
     * @return baseVotes Raw token voting power
     * @return quadraticVotes Quadratic adjusted voting power
     * @return reputation Account's reputation score
     * @return finalVotes Final calculated voting power
     */
    function getAccountVotingDetails(address account, uint256 timepoint)
        external
        view
        returns (
            uint256 baseVotes,
            uint256 quadraticVotes,
            uint256 reputation,
            uint256 finalVotes
        )
    {
        baseVotes = super.getVotes(account, timepoint);
        reputation = reputationContract.reputation(account);
        
        if (baseVotes == 0) {
            return (0, 0, reputation, 0);
        }
        
        // Convert from wei to token units for quadratic calculation
        uint256 tokenAmount = baseVotes / 1e18;
        if (tokenAmount == 0 && baseVotes > 0) tokenAmount = 1;
        
        quadraticVotes = sqrt(tokenAmount);
        uint256 reputationMultiplier = 100 + reputation;
        finalVotes = (quadraticVotes * reputationMultiplier) / 100;
        
        return (baseVotes, quadraticVotes, reputation, finalVotes);
    }
}
