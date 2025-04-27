// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IUniswapV2Factory {
    function createPair(address tokenA, address tokenB) external returns (address pair);
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IUniswapV2Router02 {
    function factory() external view returns (address);
    function WETH() external view returns (address);
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
    function addLiquidityETH(
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
 * @title Luminary Nexus Token
 * @dev ERC20 Token with transaction fees and automated liquidity management
 * @custom:version 1.0
 * @custom:chain Polygon PoS Network
 */
contract LuminaryNexusToken is ERC20, Ownable {
    
    // Constants
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion tokens
    uint256 public constant MIN_INFLATION_RATE = 0; // 0%
    uint256 public constant MAX_INFLATION_RATE = 500; // 5%
    uint256 public constant BASIS_POINTS = 10000; // For percentage calculations (100% = 10000)
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    
    // Fee configuration
    uint256 public treasuryFeePercent = 150; // 1.5% in basis points
    uint256 public liquidityFeePercent = 50; // 0.5% in basis points
    uint256 public minTokensBeforeSwap = 100000 * 10**18; // Minimum tokens to accumulate before swap
    
    // Inflation configuration
    uint256 public currentAnnualInflationRate = 200; // 2% in basis points
    uint256 public lastInflationMintTime;
    
    // Address configuration
    address public communityTreasury;
    address public liquidityPoolAddress;
    address public immutable uniswapV2RouterAddress;
    
    // Mappings
    mapping(address => bool) private _isExcludedFromFee;
    
    // Flags
    bool private _inSwapAndLiquify;
    
    // Events
    event TreasuryAddressUpdated(address indexed previousTreasury, address indexed newTreasury);
    event LiquidityPoolAddressUpdated(address indexed previousPool, address indexed newPool);
    event FeeExclusionUpdated(address indexed account, bool excluded);
    event InflationRateUpdated(uint256 previousRate, uint256 newRate);
    event TreasuryFeeUpdated(uint256 previousFee, uint256 newFee);
    event LiquidityFeeUpdated(uint256 previousFee, uint256 newFee);
    event InflationMinted(uint256 amount);
    event FeesLiquified(uint256 tokensSwapped, uint256 ethReceived, uint256 tokensIntoLiquidity);
    event MinTokensBeforeSwapUpdated(uint256 previousAmount, uint256 newAmount);
    event FeesDistributed(uint256 treasuryFeeAmount, uint256 liquidityFeeAmount);
    
    // Modifier to prevent reentrancy
    modifier lockTheSwap {
        _inSwapAndLiquify = true;
        _;
        _inSwapAndLiquify = false;
    }
    
    /**
     * @dev Constructor initializes the contract
     * @param _initialOwner Address that will receive the initial token supply and become owner
     * @param _communityTreasury Address of the DAO treasury
     * @param _routerAddress Address of the QuickSwap V2 Router on Polygon
     */
    constructor(
        address _initialOwner,
        address _communityTreasury,
        address _routerAddress
    ) ERC20("Luminary Nexus Token", "LNX") Ownable(_initialOwner) {
        require(_initialOwner != address(0), "Invalid initial owner address");
        require(_communityTreasury != address(0), "Invalid treasury address");
        require(_routerAddress != address(0), "Invalid router address");
        
        communityTreasury = _communityTreasury;
        uniswapV2RouterAddress = _routerAddress;
        lastInflationMintTime = block.timestamp;
        
        // Mint initial supply to the initial owner
        _mint(_initialOwner, INITIAL_SUPPLY);
        
        // Create pair on QuickSwap (assuming WMATIC pairing)
        IUniswapV2Router02 uniswapV2Router = IUniswapV2Router02(_routerAddress);
        address wmaticAddress = uniswapV2Router.WETH();
        
        // Get or create liquidity pair
        address factory = uniswapV2Router.factory();
        liquidityPoolAddress = IUniswapV2Factory(factory).getPair(address(this), wmaticAddress);
        
        // If pair doesn't exist, create it
        if (liquidityPoolAddress == address(0)) {
            liquidityPoolAddress = IUniswapV2Factory(factory).createPair(address(this), wmaticAddress);
        }
        
        // Exclude critical addresses from fees
        _isExcludedFromFee[_initialOwner] = true;
        _isExcludedFromFee[_communityTreasury] = true;
        _isExcludedFromFee[address(this)] = true;
        _isExcludedFromFee[liquidityPoolAddress] = true;
    }
    
    /**
     * @dev Returns whether an address is excluded from fees
     * @param account The address to check
     * @return True if excluded, false otherwise
     */
    function isExcludedFromFee(address account) public view returns (bool) {
        return _isExcludedFromFee[account];
    }
    
    /**
     * @dev Excludes or includes an account from fees
     * @param account The address to update
     * @param excluded True to exclude from fees, false to include
     */
    function excludeFromFee(address account, bool excluded) external onlyOwner {
        require(account != address(0), "Invalid address");
        _isExcludedFromFee[account] = excluded;
        emit FeeExclusionUpdated(account, excluded);
    }
    
    /**
     * @dev Updates the treasury address
     * @param newTreasury The new treasury address
     */
    function setTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = communityTreasury;
        communityTreasury = newTreasury;
        _isExcludedFromFee[newTreasury] = true;
        emit TreasuryAddressUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @dev Updates the liquidity pool address
     * @param newLiquidityPool The new liquidity pool address
     */
    function setLiquidityPoolAddress(address newLiquidityPool) external onlyOwner {
        require(newLiquidityPool != address(0), "Invalid pool address");
        address oldPool = liquidityPoolAddress;
        liquidityPoolAddress = newLiquidityPool;
        _isExcludedFromFee[newLiquidityPool] = true;
        emit LiquidityPoolAddressUpdated(oldPool, newLiquidityPool);
    }
    
    /**
     * @dev Updates the inflation rate
     * @param newRateBps The new inflation rate in basis points
     */
    function setInflationRate(uint256 newRateBps) external onlyOwner {
        require(newRateBps >= MIN_INFLATION_RATE && newRateBps <= MAX_INFLATION_RATE, "Invalid inflation rate");
        uint256 oldRate = currentAnnualInflationRate;
        currentAnnualInflationRate = newRateBps;
        emit InflationRateUpdated(oldRate, newRateBps);
    }
    
    /**
     * @dev Updates the treasury fee percentage
     * @param newFeePercent The new fee percentage in basis points
     */
    function setTreasuryFeePercent(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 300, "Fee too high"); // Max 3%
        uint256 oldFee = treasuryFeePercent;
        treasuryFeePercent = newFeePercent;
        emit TreasuryFeeUpdated(oldFee, newFeePercent);
    }
    
    /**
     * @dev Updates the liquidity fee percentage
     * @param newFeePercent The new fee percentage in basis points
     */
    function setLiquidityFeePercent(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= 200, "Fee too high"); // Max 2%
        uint256 oldFee = liquidityFeePercent;
        liquidityFeePercent = newFeePercent;
        emit LiquidityFeeUpdated(oldFee, newFeePercent);
    }
    
    /**
     * @dev Updates the minimum tokens needed before swap and liquify
     * @param _minTokensBeforeSwap The new minimum amount
     */
    function setMinTokensBeforeSwap(uint256 _minTokensBeforeSwap) external onlyOwner {
        require(_minTokensBeforeSwap > 0, "Amount must be greater than 0");
        uint256 oldAmount = minTokensBeforeSwap;
        minTokensBeforeSwap = _minTokensBeforeSwap;
        emit MinTokensBeforeSwapUpdated(oldAmount, _minTokensBeforeSwap);
    }
    
    /**
     * @dev Internal function to check if swap and liquify should be triggered
     * @return True if swap and liquify should be triggered
     */
    function shouldSwapAndLiquify() internal view returns (bool) {
        return balanceOf(address(this)) >= minTokensBeforeSwap && !_inSwapAndLiquify;
    }
    
    /**
     * @dev Hook for custom token transfer logic
     * @param sender The address sending tokens
     * @param recipient The address receiving tokens
     * @param amount The amount of tokens being transferred
     * @return The amount to actually transfer
     */
    function _customTransfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal returns (uint256) {
        // Auto liquidity: Check if we should convert collected fees to liquidity
        if (
            shouldSwapAndLiquify() &&
            sender != liquidityPoolAddress && // Avoid triggering during liquidity operations
            !_isExcludedFromFee[sender] &&
            !_isExcludedFromFee[recipient]
        ) {
            swapAndLiquifyFees();
        }
        
        // Check if sender or recipient is excluded from fee
        bool takeFee = !_isExcludedFromFee[sender] && !_isExcludedFromFee[recipient] && !_inSwapAndLiquify;
        
        if (!takeFee) {
            return amount;
        } else {
            // Calculate fees
            uint256 treasuryFeeAmount = amount * treasuryFeePercent / BASIS_POINTS;
            uint256 liquidityFeeAmount = amount * liquidityFeePercent / BASIS_POINTS;
            uint256 totalFeeAmount = treasuryFeeAmount + liquidityFeeAmount;
            uint256 transferAmount = amount - totalFeeAmount;
            
            require(transferAmount > 0, "Transfer amount too small");
            
            // Transfer fees
            if (treasuryFeeAmount > 0) {
                super._transfer(sender, communityTreasury, treasuryFeeAmount);
            }
            
            if (liquidityFeeAmount > 0) {
                super._transfer(sender, address(this), liquidityFeeAmount);
            }
            
            emit FeesDistributed(treasuryFeeAmount, liquidityFeeAmount);
            
            return transferAmount;
        }
    }
    
    /**
     * @dev Override ERC20 transfer function to implement fees
     * @param to Address receiving tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer was successful
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        address sender = _msgSender();
        uint256 transferAmount = _customTransfer(sender, to, amount);
        super._transfer(sender, to, transferAmount);
        return true;
    }
    
    /**
     * @dev Override ERC20 transferFrom function to implement fees
     * @param from Address sending tokens
     * @param to Address receiving tokens
     * @param amount Amount of tokens to transfer
     * @return True if transfer was successful
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        uint256 transferAmount = _customTransfer(from, to, amount);
        super._transfer(from, to, transferAmount);
        return true;
    }
    
    /**
     * @dev Swap and liquify accumulated fees
     */
    function swapAndLiquifyFees() public lockTheSwap {
        uint256 contractTokenBalance = balanceOf(address(this));
        require(contractTokenBalance > 0, "No tokens to liquify");
        
        // Split the contract token balance into halves
        uint256 halfForSwap = contractTokenBalance / 2;
        uint256 otherHalf = contractTokenBalance - halfForSwap;
        
        // Initial ETH balance
        uint256 initialETHBalance = address(this).balance;
        
        // Swap tokens for ETH
        swapTokensForEth(halfForSwap);
        
        // Get the amount of ETH obtained from the swap
        uint256 ethReceived = address(this).balance - initialETHBalance;
        
        // Add liquidity to DEX
        addLiquidity(otherHalf, ethReceived);
        
        emit FeesLiquified(halfForSwap, ethReceived, otherHalf);
    }
    
    /**
     * @dev Swap tokens for ETH
     * @param tokenAmount Amount of tokens to swap
     */
    function swapTokensForEth(uint256 tokenAmount) private {
        // Generate the DEX pair path of token -> WETH
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = IUniswapV2Router02(uniswapV2RouterAddress).WETH();
        
        // Approve router to spend tokens
        _approve(address(this), uniswapV2RouterAddress, tokenAmount);
        
        // Swap tokens for ETH
        IUniswapV2Router02(uniswapV2RouterAddress).swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // Accept any amount of ETH
            path,
            address(this), // Receiver of the ETH
            block.timestamp + 300 // 5 minutes deadline
        );
    }
    
    /**
     * @dev Add liquidity to DEX
     * @param tokenAmount Amount of tokens to add
     * @param ethAmount Amount of ETH to add
     */
    function addLiquidity(uint256 tokenAmount, uint256 ethAmount) private {
        // Approve router to spend tokens
        _approve(address(this), uniswapV2RouterAddress, tokenAmount);
        
        // Add liquidity to DEX
        IUniswapV2Router02(uniswapV2RouterAddress).addLiquidityETH{value: ethAmount}(
            address(this),
            tokenAmount,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            owner(), // LP tokens sent to owner (DAO)
            block.timestamp + 300 // 5 minutes deadline
        );
    }
    
    /**
     * @dev Trigger inflation mint based on elapsed time
     */
    function triggerInflationMint() external onlyOwner {
        uint256 timeElapsed = block.timestamp - lastInflationMintTime;
        require(timeElapsed > 0, "No time has elapsed since last mint");
        
        uint256 currentSupply = totalSupply();
        uint256 inflationAmount = currentSupply
            * currentAnnualInflationRate
            * timeElapsed
            / SECONDS_PER_YEAR
            / BASIS_POINTS;
        
        if (inflationAmount > 0) {
            _mint(communityTreasury, inflationAmount);
            lastInflationMintTime = block.timestamp;
            emit InflationMinted(inflationAmount);
        }
    }
    
    // Required to receive ETH from router when swapping
    receive() external payable {}
}