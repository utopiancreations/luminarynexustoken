// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title Luminary Nexus Timelock Control Contract
 * @dev This contract implements a TimelockController for the Luminary Nexus DAO.
 * It introduces a delay for executing proposals passed by the Governor contract,
 * providing a crucial security measure and a window for community review.
 */
contract LuminaryNexusTimelock is TimelockController {
    // Minimum delay for proposals (e.g., 2 days)
    uint256 public constant MIN_DELAY = 2 days;

    /**
     * @dev Initializes the TimelockControl contract.
     * @param proposer The address that can schedule operations (typically the Governor contract).
     * @param executor The address that can execute operations (typically the Governor contract).
     * @param admin The address that can grant/revoke roles (initially the deployer, then transferred to Governor).
     */
    constructor(address proposer, address executor, address admin)
        TimelockController(MIN_DELAY, [proposer], [executor], admin)
    {}
}
