// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Luminary Nexus Timelock Control Contract
 * @dev This contract implements a TimelockController for the Luminary Nexus DAO.
 * It introduces a delay for executing proposals passed by the Governor contract,
 * providing a crucial security measure and a window for community review.
 * 
 * Updated for OpenZeppelin v5 compatibility.
 */
contract LuminaryNexusTimelock is TimelockController {
    // Minimum delay for proposals (e.g., 2 days)
    uint256 public constant MIN_DELAY = 2 days;

    /**
     * @dev Initializes the TimelockController contract.
     * @param proposers Array of addresses that can schedule operations (typically the Governor contract).
     * @param executors Array of addresses that can execute operations (typically the Governor contract).
     * @param admin The address that can grant/revoke roles (initially the deployer, then transferred to Governor).
     */
    constructor(
        address[] memory proposers, 
        address[] memory executors, 
        address admin
    ) TimelockController(MIN_DELAY, proposers, executors, admin) {
        // Constructor logic handled by TimelockController
    }

    /**
     * @dev Convenience constructor for single proposer/executor
     * @param proposer The address that can schedule operations (typically the Governor contract).
     * @param executor The address that can execute operations (typically the Governor contract).
     * @param admin The address that can grant/revoke roles (initially the deployer, then transferred to Governor).
     */
    function createTimelock(
        address proposer, 
        address executor, 
        address admin
    ) external pure returns (address[] memory proposers, address[] memory executors) {
        proposers = new address[](1);
        executors = new address[](1);
        proposers[0] = proposer;
        executors[0] = executor;
        return (proposers, executors);
    }
}
