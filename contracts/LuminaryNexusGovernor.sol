// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/governance/Governor.sol";

abstract contract LuminaryNexusGovernor is Governor {
    // Abstract functions that must be implemented by derived contracts
    function votingPeriod() public view virtual override returns (uint256);
    function votingDelay() public view virtual override returns (uint256);
    function proposalThreshold() public view virtual override returns (uint256);

    // Constructor to pass the name to the base Governor contract
    constructor(string memory name) Governor(name) {}
}