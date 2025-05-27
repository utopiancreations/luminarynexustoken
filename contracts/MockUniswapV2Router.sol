// contracts/MockUniswapV2Router.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockUniswapV2Router
 * @dev A simplified mock of a Uniswap V2 Router for testing purposes
 */
contract MockUniswapV2Router {
    address private immutable _factory;
    address private immutable _WETH;
    
    constructor() {
        // For testing, we'll just use this contract's address as factory
        _factory = address(this);
        // And this contract's address as WETH
        _WETH = address(this);
    }
    
    /**
     * @dev Returns the factory address
     */
    function factory() external view returns (address) {
        return _factory;
    }
    
    /**
     * @dev Returns the WETH address
     */
    function WETH() external view returns (address) {
        return _WETH;
    }
    
    /**
     * @dev Mock implementation of addLiquidity
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity) {
        // Just return the desired amounts
        return (amountADesired, amountBDesired, amountADesired);
    }
    
    /**
     * @dev Mock implementation of addLiquidityETH
     */
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity) {
        // Just return the desired amount and the sent ETH
        return (amountTokenDesired, msg.value, amountTokenDesired);
    }
    
    /**
     * @dev Mock implementation of swapExactTokensForTokensSupportingFeeOnTransferTokens
     */
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external {
        // Do nothing, just a mock
    }
    
    /**
     * @dev Mock implementation of swapExactTokensForETHSupportingFeeOnTransferTokens
     */
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external {
        // Do nothing, just a mock
    }
    
    /**
     * @dev Mock implementation of getPair
     */
    function getPair(address tokenA, address tokenB) external view returns (address) {
        // Just return this contract's address as the pair
        return address(this);
    }
    
    /**
     * @dev Mock implementation of createPair
     */
    function createPair(address tokenA, address tokenB) external returns (address) {
        // Just return this contract's address as the pair
        return address(this);
    }
    
    // Required to receive ETH
    receive() external payable {}
}