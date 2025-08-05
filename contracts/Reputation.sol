// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title Reputation Contract
 * @dev This contract manages reputation scores for community members.
 * The Governor contract will use these scores to weight votes.
 */
contract Reputation {
    mapping(address => uint256) public reputation;
    address public owner;

    event ReputationUpdated(address indexed user, uint256 newReputation);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @dev Update the reputation of a user.
     * Only the owner (the Governor contract) can call this function.
     * @param user The address of the user.
     * @param newReputation The new reputation score.
     */
    function updateReputation(address user, uint256 newReputation) external {
        require(msg.sender == owner, "Only owner can update reputation");
        reputation[user] = newReputation;
        emit ReputationUpdated(user, newReputation);
    }
}
