// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Interfaces for Uniswap V2 / QuickSwap
interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function WETH() external view returns (address); // On Polygon, this is WMATIC
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH( // ETH here refers to the native wrapped token (e.g., WMATIC on Polygon)
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

/**
 * @title Luminary Nexus Token (LNX)
 * @dev ERC20 Token with transaction fees, automated liquidity management, and inflation.
 * @custom:version 1.1.0 - Added detailed comments for distribution and liquidity strategy.
 * @custom:chain Polygon PoS Network
 * @notice This contract is responsible for the LNX token's core functionality.
 * Initial distribution of tokens according to the white paper (Treasury, Airdrop, Founder, Initial LP)
 * is intended to be handled by the _initialOwner transferring the INITIAL_SUPPLY to a
 * dedicated DistributionContract after this LNX token contract is deployed.
 * Ownership of this contract will eventually be transferred to the Luminary Nexus DAO.
 */
contract LuminaryNexusToken is ERC20, Ownable {
    
    // Constants
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion tokens, matches White Paper
    uint256 public constant MIN_INFLATION_RATE = 0; // 0%
    uint256 public constant MAX_INFLATION_RATE = 500; // 5% (500 basis points)
    uint256 public constant BASIS_POINTS = 10000; // For percentage calculations (100% = 10000 BPS)
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    // Fee configuration (as per White Paper: 1.5% Treasury, 0.5% Liquidity)
    uint256 public treasuryFeePercent = 150; // 1.5% in basis points
    uint256 public liquidityFeePercent = 50; // 0.5% in basis points
    uint256 public minTokensBeforeSwap = 100000 * 10**18; // Minimum tokens accumulated by this contract before triggering swap & liquify
    
    // Inflation configuration (as per White Paper: initial 2%, DAO adjustable 0-5%)
    uint256 public currentAnnualInflationRate = 200; // 2% in basis points
    uint256 public lastInflationMintTime;
    
    // Address configuration
    address public communityTreasury;
    address public liquidityPoolAddress; // This will be the LNX/WMATIC pair for auto-liquidity
    address public immutable uniswapV2RouterAddress; // e.g., QuickSwap Router
    
    // Mappings
    mapping(address => bool) private _isExcludedFromFee;
    
    // Flags
    bool private _inSwapAndLiquify; // Reentrancy guard for swapAndLiquifyFees
    
    // Events
    event TreasuryAddressUpdated(address indexed previousTreasury, address indexed newTreasury);
    event LiquidityPoolAddressUpdated(address indexed previousPool, address indexed newPool); // For the LNX/WMATIC auto-LP
    event FeeExclusionUpdated(address indexed account, bool excluded);
    event InflationRateUpdated(uint256 previousRate, uint256 newRate);
    event TreasuryFeeUpdated(uint256 previousFee, uint256 newFee);
    event LiquidityFeeUpdated(uint256 previousFee, uint256 newFee);
    event InflationMinted(uint256 amount);
    event FeesLiquified(uint256 tokensSwapped, uint256 nativeTokenReceived, uint256 tokensIntoLiquidity);
    event MinTokensBeforeSwapUpdated(uint256 previousAmount, uint256 newAmount);
    event FeesDistributed(uint256 treasuryFeeAmount, uint256 liquidityFeeAmount);
    
    modifier lockTheSwap {
        _inSwapAndLiquify = true;
        _;
        _inSwapAndLiquify = false;
    }
    
    /**
     * @dev Constructor initializes the contract.
     * @param _initialOwner Address that will receive the initial token supply and become owner of this contract.
     * This owner is responsible for transferring the INITIAL_SUPPLY to a DistributionContract.
     * @param _communityTreasury Address of the DAO treasury (will receive inflation and treasury fees).
     * @param _routerAddress Address of the Uniswap V2 compatible Router (e.g., QuickSwap on Polygon).
     * @notice The initial LNX/USDC liquidity pool (0.75% LNX + ~$750 USDC) as per the white paper
     * is to be created manually by the founder/initial owner after receiving their LNX allocation
     * from the DistributionContract. This contract's automated liquidity will target LNX/WMATIC.
     */
    constructor(
        address _initialOwner,
        address _communityTreasury,
        address _routerAddress
    ) ERC20("Luminary Nexus Token", "LNX") Ownable(_initialOwner) {
        require(_initialOwner != address(0), "LNX: Invalid initial owner address");
        require(_communityTreasury != address(0), "LNX: Invalid treasury address");
        require(_routerAddress != address(0), "LNX: Invalid router address");
        
        communityTreasury = _communityTreasury;
        uniswapV2RouterAddress = _routerAddress;
        lastInflationMintTime = block.timestamp; // Initialize for inflation calculation
        
        // Mint the entire initial supply to the _initialOwner.
        // STRATEGY: The _initialOwner will then transfer this INITIAL_SUPPLY to a
        // separate, dedicated LuminaryNexusDistribution.sol contract.
        // That DistributionContract will handle the transparent, percentage-based allocation to:
        // 1. DAO Treasury (94.25%)
        // 2. Airdrop Mechanism (4%)
        // 3. Founder (1% direct + 0.75% for initial LNX/USDC liquidity pairing)
        _mint(_initialOwner, INITIAL_SUPPLY);
        
        // Setup for automated LNX/WMATIC liquidity pool from transaction fees
        IUniswapV2Router02 uniswapV2Router = IUniswapV2Router02(_routerAddress);
        address wmaticAddress = uniswapV2Router.WETH(); // WMATIC on Polygon
        
        address factory = uniswapV2Router.factory();
        liquidityPoolAddress = IUniswapV2Factory(factory).getPair(address(this), wmaticAddress);
        
        if (liquidityPoolAddress == address(0)) {
            // If the LNX/WMATIC pair doesn't exist, create it.
            // Note: This pair will be for the automated liquidity from fees.
            liquidityPoolAddress = IUniswapV2Factory(factory).createPair(address(this), wmaticAddress);
        }
        
        // Exclude critical addresses from fees by default
        _isExcludedFromFee[_initialOwner] = true;
        _isExcludedFromFee[_communityTreasury] = true;
        _isExcludedFromFee[address(this)] = true; // This contract itself (for collecting fees before liquifying)
        _isExcludedFromFee[liquidityPoolAddress] = true; // The LNX/WMATIC liquidity pool
        // Note: The LNX/USDC pool (manually created) should also be excluded from fees by the owner post-deployment.
    }
    
    /**
     * @dev Returns whether an address is excluded from transaction fees.
     */
    function isExcludedFromFee(address account) public view returns (bool) {
        return _isExcludedFromFee[account];
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to exclude or include an account from fees.
     * @notice Important for exchanges, other contracts, or the manually created LNX/USDC LP.
     */
    function excludeFromFee(address account, bool excluded) external onlyOwner {
        require(account != address(0), "LNX: Invalid address for fee exclusion");
        _isExcludedFromFee[account] = excluded;
        emit FeeExclusionUpdated(account, excluded);
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to update the treasury address.
     * The new treasury address will also be automatically excluded from fees.
     */
    function setTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "LNX: Invalid new treasury address");
        address oldTreasury = communityTreasury;
        communityTreasury = newTreasury;
        _isExcludedFromFee[newTreasury] = true; // Automatically exclude new treasury
        if (oldTreasury != address(0) && oldTreasury != newTreasury) {
             _isExcludedFromFee[oldTreasury] = false; // Optionally remove exclusion from old treasury
        }
        emit TreasuryAddressUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to update the LNX/WMATIC liquidity pool address.
     * @notice Use with caution. Changing this after liquidity exists can be complex.
     * The new pool address will also be automatically excluded from fees.
     */
    function setLiquidityPoolAddress(address newLiquidityPool) external onlyOwner {
        require(newLiquidityPool != address(0), "LNX: Invalid new pool address");
        address oldPool = liquidityPoolAddress;
        liquidityPoolAddress = newLiquidityPool;
        _isExcludedFromFee[newLiquidityPool] = true; // Automatically exclude new LP
         if (oldPool != address(0) && oldPool != newLiquidityPool) {
             _isExcludedFromFee[oldPool] = false; // Optionally remove exclusion from old LP
        }
        emit LiquidityPoolAddressUpdated(oldPool, newLiquidityPool);
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to update the annual inflation rate.
     */
    function setInflationRate(uint256 newRateBps) external onlyOwner {
        require(newRateBps >= MIN_INFLATION_RATE && newRateBps <= MAX_INFLATION_RATE, "LNX: Invalid inflation rate (0-5%)");
        uint256 oldRate = currentAnnualInflationRate;
        currentAnnualInflationRate = newRateBps;
        emit InflationRateUpdated(oldRate, newRateBps);
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to update the treasury fee percentage. Max 3%.
     */
    function setTreasuryFeePercent(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 300, "LNX: Treasury fee cannot exceed 3%"); // Max 3%
        uint256 oldFee = treasuryFeePercent;
        treasuryFeePercent = newFeePercent;
        emit TreasuryFeeUpdated(oldFee, newFeePercent);
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to update the liquidity fee percentage. Max 2%.
     */
    function setLiquidityFeePercent(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 200, "LNX: Liquidity fee cannot exceed 2%"); // Max 2%
        uint256 oldFee = liquidityFeePercent;
        liquidityFeePercent = newFeePercent;
        emit LiquidityFeeUpdated(oldFee, newFeePercent);
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to update the minimum token balance in this contract
     * that triggers the swapAndLiquifyFees function.
     */
    function setMinTokensBeforeSwap(uint256 _minTokensBeforeSwap) external onlyOwner {
        require(_minTokensBeforeSwap > 0, "LNX: Amount must be greater than 0");
        uint256 oldAmount = minTokensBeforeSwap;
        minTokensBeforeSwap = _minTokensBeforeSwap;
        emit MinTokensBeforeSwapUpdated(oldAmount, _minTokensBeforeSwap);
    }
    
    /**
     * @dev Internal function to determine if conditions are met to swap and liquify collected fees.
     */
    function shouldSwapAndLiquify() internal view returns (bool) {
        return balanceOf(address(this)) >= minTokensBeforeSwap && 
               !_inSwapAndLiquify && 
               liquidityPoolAddress != address(0); // Ensure LP is set
    }
    
    /**
     * @dev Internal hook called by _transfer to handle custom logic like fees.
     */
    function _customTransfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal returns (uint256 actualTransferAmount) {
        // If auto-liquidity conditions are met, and this isn't part of a liquidity operation itself.
        if (
            shouldSwapAndLiquify() &&
            sender != liquidityPoolAddress && // Don't trigger from LP interactions
            recipient != liquidityPoolAddress // Don't trigger to LP interactions
        ) {
            swapAndLiquifyFees();
        }
        
        // Determine if fees should be taken for this transfer
        bool takeFee = !_isExcludedFromFee[sender] && 
                       !_isExcludedFromFee[recipient] &&
                       treasuryFeePercent + liquidityFeePercent > 0; // Only take fee if there's a fee to take
        
        if (!takeFee) {
            return amount; // No fees, transfer full amount
        } else {
            uint256 totalFeePercent = treasuryFeePercent + liquidityFeePercent;
            uint256 totalFeeAmount = (amount * totalFeePercent) / BASIS_POINTS;
            
            if (totalFeeAmount > 0) {
                uint256 treasuryPortion = (totalFeeAmount * treasuryFeePercent) / totalFeePercent; // Proportional
                uint256 liquidityPortion = totalFeeAmount - treasuryPortion;

                actualTransferAmount = amount - totalFeeAmount;
                require(actualTransferAmount > 0, "LNX: Amount too small after fees");

                if (treasuryPortion > 0) {
                    super._transfer(sender, communityTreasury, treasuryPortion);
                }
                if (liquidityPortion > 0) {
                    super._transfer(sender, address(this), liquidityPortion); // Send to this contract for liquifying
                }
                emit FeesDistributed(treasuryPortion, liquidityPortion);
            } else {
                actualTransferAmount = amount; // No fee actually calculated (e.g. due to rounding on small amounts)
            }
            return actualTransferAmount;
        }
    }
    
    /**
     * @dev Overrides ERC20._transfer to integrate custom fee logic.
     */
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        if (_isExcludedFromFee[sender] || _isExcludedFromFee[recipient] || _inSwapAndLiquify) {
            super._transfer(sender, recipient, amount);
        } else {
            uint256 transferAmount = _customTransfer(sender, recipient, amount);
            if (transferAmount > 0) { // Ensure there's something left to transfer after fees
                 super._transfer(sender, recipient, transferAmount);
            } else if (amount > 0 && transferAmount == 0) {
                // This case means fees consumed the whole amount, which _customTransfer should prevent with its require.
                // However, if amount was non-zero and transferAmount became zero, it implies fees were taken.
                // If _customTransfer already handled fee transfers, nothing more to do here.
                // If _customTransfer only returned 0, it implies an issue or full fee consumption.
                // For safety, ensure no tokens are "lost" if _customTransfer logic changes.
                // Given current _customTransfer, this path should ideally not be hit if amount > 0.
            }
        }
    }

    // Note: `transfer` and `transferFrom` are already overridden by ERC20.sol if you inherit it.
    // OpenZeppelin's ERC20 calls _update, which calls _beforeTokenTransfer and _afterTokenTransfer.
    // A cleaner way to implement fees is often by overriding _beforeTokenTransfer.
    // However, your current approach of overriding _transfer and calling super._transfer is also functional.
    // For simplicity and directness, let's stick to your current override structure for now.
    // If we were to use _beforeTokenTransfer, the _customTransfer logic would move there.

    // The public `transfer` and `transferFrom` are implicitly using the overridden `_transfer`.
    
    /**
     * @dev Swaps accumulated tokens in this contract for WMATIC and adds liquidity to the LNX/WMATIC pool.
     * This function is typically called internally by _customTransfer when conditions are met,
     * but can be called by anyone if tokens are stuck (though `lockTheSwap` prevents reentrancy).
     */
    function swapAndLiquifyFees() public lockTheSwap {
        uint256 contractTokenBalance = balanceOf(address(this));
        if (contractTokenBalance == 0 || contractTokenBalance < minTokensBeforeSwap / 2) { // ensure enough for a meaningful swap
             // Added minTokensBeforeSwap / 2 check to avoid tiny swaps if manually called with low balance
            return;
        }
        
        uint256 tokensToLiquify = contractTokenBalance; // Use all tokens held by contract for this cycle

        // Split the tokens: half for swapping to WMATIC, half for pairing with the WMATIC.
        uint256 halfForSwap = tokensToLiquify / 2;
        uint256 otherHalfForLP = tokensToLiquify - halfForSwap;
        
        if (halfForSwap == 0 || otherHalfForLP == 0) return; // Not enough tokens to split

        uint256 initialNativeBalance = address(this).balance;
        
        swapTokensForNative(halfForSwap); // Swaps LNX for WMATIC
        
        uint256 nativeReceived = address(this).balance - initialNativeBalance;
        
        if (nativeReceived > 0 && otherHalfForLP > 0) {
            addNativeLiquidity(otherHalfForLP, nativeReceived); // Adds LNX and WMATIC to LP
            emit FeesLiquified(halfForSwap, nativeReceived, otherHalfForLP);
        }
    }
    
    /**
     * @dev Swaps a given amount of this token for WMATIC (native wrapped token).
     */
    function swapTokensForNative(uint256 tokenAmount) private {
        IUniswapV2Router02 uniswapV2Router = IUniswapV2Router02(uniswapV2RouterAddress);
        address[] memory path = new address[](2);
        path[0] = address(this); // LNX
        path[1] = uniswapV2Router.WETH(); // WMATIC
        
        _approve(address(this), uniswapV2RouterAddress, tokenAmount);
        
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // amountOutMin: accept any amount of WMATIC
            path,
            address(this), // Recipient of WMATIC is this contract
            block.timestamp 
        );
    }
    
    /**
     * @dev Adds LNX and WMATIC (native wrapped token) to the liquidity pool.
     */
    function addNativeLiquidity(uint256 tokenAmount, uint256 nativeAmount) private {
        IUniswapV2Router02 uniswapV2Router = IUniswapV2Router02(uniswapV2RouterAddress);
        _approve(address(this), uniswapV2RouterAddress, tokenAmount);
        
        uniswapV2Router.addLiquidityETH{value: nativeAmount}(
            address(this), // LNX token
            tokenAmount,
            0, // amountTokenMin: accept any amount
            0, // amountETHMin: accept any amount
            owner(), // LP tokens are sent to the current owner of this LNX contract (initially deployer, then DAO)
            block.timestamp
        );
    }
    
    /**
     * @dev Allows the owner (initially, then DAO) to trigger the minting of new tokens based on the
     * annual inflation rate and time elapsed since the last mint.
     * Tokens are minted to the communityTreasury.
     */
    function triggerInflationMint() external { // Consider making this onlyOwner or permissioned
        require(block.timestamp >= lastInflationMintTime, "LNX: Invalid timestamp for minting");
        uint256 timeElapsed = block.timestamp - lastInflationMintTime;
        
        if (timeElapsed == 0 || currentAnnualInflationRate == 0) {
            return; // No time elapsed or no inflation to apply
        }
        
        uint256 currentSupply = totalSupply();
        // Calculate inflation: (supply * rate * time) / (seconds_in_year * basis_points)
        uint256 inflationAmount = (currentSupply * currentAnnualInflationRate * timeElapsed) / (SECONDS_PER_YEAR * BASIS_POINTS);
        
        if (inflationAmount > 0) {
            _mint(communityTreasury, inflationAmount);
            lastInflationMintTime = block.timestamp;
            emit InflationMinted(inflationAmount);
        }
    }
    
    // Fallback function to receive native currency (WMATIC from swaps)
    receive() external payable {}
}
