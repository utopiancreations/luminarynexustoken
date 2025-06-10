// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Luminary Nexus Initial Token Distribution Contract
 * @dev This contract is responsible for the one-time initial distribution of LNX tokens
 * according to the percentages outlined in the Luminary Nexus White Paper.
 * It is designed to be funded by the initial owner of the LNX token contract,
 * and then execute the distribution in a transparent, on-chain manner.
 * @custom:version 1.0.0
 */
contract LuminaryNexusDistribution is Ownable {
    IERC20 public immutable lnxToken; // The LNX token contract instance

    // Beneficiary Addresses (to be set at deployment with actual addresses)
    address public immutable daoTreasuryAddress;
    address payable public immutable founderAddress; // Payable if founder needs to handle LP ETH part too
    address public immutable airdropMechanismAddress; // Could be an EOA or a dedicated airdrop contract

    // Total LNX supply as per White Paper, matching LNX contract's INITIAL_SUPPLY
    // This is the amount this contract expects to receive and distribute.
    uint256 public constant TOTAL_LNX_TO_DISTRIBUTE = 1_000_000_000 * (10**18); // 1 Billion LNX

    // Allocation percentages in Basis Points (1% = 100 BPS, 100% = 10000 BPS)
    // From White Paper: 94.25% Treasury, 4% Airdrop, 1% Founder, 0.75% Initial Liquidity
    uint256 public constant TREASURY_BPS = 9425;          // 94.25%
    uint256 public constant AIRDROP_BPS = 400;            // 4.00%
    uint256 public constant FOUNDER_DIRECT_BPS = 100;     // 1.00% (Direct to founder)
    uint256 public constant LIQUIDITY_LNX_PORTION_BPS = 75; // 0.75% (LNX portion for initial liquidity, sent to founder to pair with USDC)

    bool public hasDistributed; // Flag to ensure distribution happens only once

    // To store the actual amounts distributed for transparency and querying
    mapping(string => uint256) public distributedAmounts;

    // Events
    event InitialDistributionExecuted(
        uint256 treasuryAmount,
        uint256 airdropAmount,
        uint256 founderDirectAmount,
        uint256 liquidityLnxPortionAmount
    );
    event NonLnxTokensRecovered(address indexed tokenAddress, address indexed recipient, uint256 amount);

    /**
     * @dev Constructor sets up the distribution contract.
     * @param _lnxTokenAddress The address of the deployed LNX token contract.
     * @param _daoTreasury The address for the DAO's community treasury.
     * @param _founder The founder's address (receives direct allocation and LNX for liquidity).
     * @param _airdropMechanism The address responsible for handling the airdrop.
     * @param _initialDistributionOwner The account that can trigger the distribution (typically the project initiator).
     */
    constructor(
        address _lnxTokenAddress,
        address _daoTreasury,
        address payable _founder,
        address _airdropMechanism,
        address _initialDistributionOwner 
    ) Ownable(_initialDistributionOwner) { // Sets the owner of this DistributionContract
        require(_lnxTokenAddress != address(0), "Distribute: LNX Token zero address");
        require(_daoTreasury != address(0), "Distribute: DAO Treasury zero address");
        require(_founder != address(0), "Distribute: Founder zero address");
        require(_airdropMechanism != address(0), "Distribute: Airdrop Mechanism zero address");

        lnxToken = IERC20(_lnxTokenAddress);
        daoTreasuryAddress = _daoTreasury;
        founderAddress = _founder;
        airdropMechanismAddress = _airdropMechanism;
    }

    /**
     * @dev Executes the one-time initial distribution of LNX tokens.
     * @notice Can only be called once by the owner of this contract.
     * Requires this contract to hold at least TOTAL_LNX_TO_DISTRIBUTE of LNX tokens.
     */
    function executeInitialDistribution() external onlyOwner {
        require(!hasDistributed, "Distribute: Already executed.");
        
        uint256 contractLnxBalance = lnxToken.balanceOf(address(this));
        require(contractLnxBalance >= TOTAL_LNX_TO_DISTRIBUTE, "Distribute: Insufficient LNX in contract.");

        // Calculate allocation amounts
        uint256 treasuryAmount = (TOTAL_LNX_TO_DISTRIBUTE * TREASURY_BPS) / 10000;
        uint256 airdropAmount = (TOTAL_LNX_TO_DISTRIBUTE * AIRDROP_BPS) / 10000;
        uint256 founderDirectAmount = (TOTAL_LNX_TO_DISTRIBUTE * FOUNDER_DIRECT_BPS) / 10000;
        uint256 liquidityLnxPortionAmount = (TOTAL_LNX_TO_DISTRIBUTE * LIQUIDITY_LNX_PORTION_BPS) / 10000;

        // Update storage for transparency
        distributedAmounts["treasury"] = treasuryAmount;
        distributedAmounts["airdrop"] = airdropAmount;
        distributedAmounts["founderDirect"] = founderDirectAmount;
        distributedAmounts["liquidityLNXPortion"] = liquidityLnxPortionAmount;

        // Perform the transfers
        _safeLnxTransfer(daoTreasuryAddress, treasuryAmount);
        _safeLnxTransfer(airdropMechanismAddress, airdropAmount);
        _safeLnxTransfer(founderAddress, founderDirectAmount);
        _safeLnxTransfer(founderAddress, liquidityLnxPortionAmount); // Founder receives LNX to pair with their own USDC

        hasDistributed = true;
        emit InitialDistributionExecuted(
            treasuryAmount,
            airdropAmount,
            founderDirectAmount,
            liquidityLnxPortionAmount
        );
    }

    /**
     * @dev Helper function to safely transfer LNX tokens.
     */
    function _safeLnxTransfer(address _to, uint256 _amount) private {
        if (_amount > 0) {
            bool success = lnxToken.transfer(_to, _amount);
            require(success, "Distribute: LNX Transfer failed");
        }
    }

    /**
     * @dev Getter function to see the pre-calculated amount for an allocation category.
     * @param _allocationName Name of the allocation category (e.g., "treasury", "airdrop").
     * @return The calculated LNX amount for that category.
     */
    function getCalculatedAllocation(string calldata _allocationName) external pure returns (uint256) {
        if (keccak256(abi.encodePacked(_allocationName)) == keccak256(abi.encodePacked("treasury"))) {
            return (TOTAL_LNX_TO_DISTRIBUTE * TREASURY_BPS) / 10000;
        }
        if (keccak256(abi.encodePacked(_allocationName)) == keccak256(abi.encodePacked("airdrop"))) {
            return (TOTAL_LNX_TO_DISTRIBUTE * AIRDROP_BPS) / 10000;
        }
        if (keccak256(abi.encodePacked(_allocationName)) == keccak256(abi.encodePacked("founderDirect"))) {
            return (TOTAL_LNX_TO_DISTRIBUTE * FOUNDER_DIRECT_BPS) / 10000;
        }
        if (keccak256(abi.encodePacked(_allocationName)) == keccak256(abi.encodePacked("liquidityLNXPortion"))) {
            return (TOTAL_LNX_TO_DISTRIBUTE * LIQUIDITY_LNX_PORTION_BPS) / 10000;
        }
        return 0; // Should not happen if valid name is provided
    }

    /**
     * @dev Allows the owner to recover any ERC20 tokens (other than LNX)
     * that might have been accidentally sent to this contract.
     * @param _tokenAddress The address of the ERC20 token to recover.
     * @param _recipient The address to send the recovered tokens to.
     * @param _amount The amount of tokens to recover.
     */
    function recoverNonLnxERC20(address _tokenAddress, address _recipient, uint256 _amount) external onlyOwner {
        require(_tokenAddress != address(lnxToken), "Distribute: Cannot recover LNX via this function.");
        require(_recipient != address(0), "Distribute: ERC20 Recovery zero address recipient.");
        
        IERC20 otherToken = IERC20(_tokenAddress);
        bool success = otherToken.transfer(_recipient, _amount);
        require(success, "Distribute: ERC20 Recovery transfer failed.");
        emit NonLnxTokensRecovered(_tokenAddress, _recipient, _amount);
    }
}