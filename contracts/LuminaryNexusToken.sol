// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title LuminaryNexusToken
 * @dev Enhanced ERC-20 token with governance capabilities, security features, and access controls
 * 
 * Features:
 * - ERC20Votes for governance participation
 * - ERC20Permit for gasless approvals
 * - Pausable for emergency stops
 * - ReentrancyGuard for attack prevention
 * - AccessControl for role-based permissions
 * 
 * Total Supply: 1,000,000,000 LNX
 */
contract LuminaryNexusToken is 
    ERC20, 
    ERC20Votes, 
    ERC20Permit, 
    Ownable, 
    ReentrancyGuard, 
    Pausable, 
    AccessControl 
{
    // Role definitions
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    // Token parameters
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Events
    event EmergencyPause(address indexed account);
    event EmergencyUnpause(address indexed account);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    /**
     * @dev Constructor that sets up the token with initial supply and roles
     * @param initialOwner The address that will own the contract and receive initial supply
     */
    constructor(address initialOwner) 
        ERC20("Luminary Nexus Token", "LNX") 
        ERC20Permit("Luminary Nexus Token")
        Ownable(initialOwner) 
    {
        // Grant roles to the initial owner
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(BURNER_ROLE, initialOwner);
        
        // Mint the total supply to the owner
        _mint(initialOwner, TOTAL_SUPPLY);
    }
    
    /**
     * @dev Pause all token transfers - emergency function
     * Can only be called by accounts with PAUSER_ROLE
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
        emit EmergencyPause(_msgSender());
    }
    
    /**
     * @dev Unpause all token transfers
     * Can only be called by accounts with PAUSER_ROLE
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
        emit EmergencyUnpause(_msgSender());
    }
    
    /**
     * @dev Mint new tokens - restricted function
     * @param to Address to receive the minted tokens
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) nonReentrant {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Burn tokens from an address - restricted function
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) public onlyRole(BURNER_ROLE) nonReentrant {
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
    
    /**
     * @dev Override transfer to add pause functionality
     */
    function _update(address from, address to, uint256 value) 
        internal 
        override(ERC20, ERC20Votes) 
        whenNotPaused 
    {
        super._update(from, to, value);
    }
    
    /**
     * @dev Override nonces for ERC20Permit compatibility
     */
    function nonces(address owner) 
        public 
        view 
        override(ERC20Permit, Nonces) 
        returns (uint256) 
    {
        return super.nonces(owner);
    }
    
    /**
     * @dev Required override for AccessControl
     */
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(AccessControl) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}