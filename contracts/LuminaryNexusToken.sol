// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LuminaryNexusToken is ERC20Votes, Ownable {
    constructor(address initialOwner) ERC20Votes("Luminary Nexus Token", "LNX", "Luminary Nexus Token", "1") Ownable(initialOwner) {
        _mint(initialOwner, 1_000_000_000 * 10**18);
    }
}