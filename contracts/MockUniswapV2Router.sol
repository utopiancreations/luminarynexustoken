// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MockUniswapV2Router
 * @dev A simplified mock of UniswapV2Router for testing purposes
 */
contract MockUniswapV2Router {
    address private _factory;
    address private _WETH;
    
    constructor() {
        // Self-assign for simplicity in tests
        _factory = address(this);
        _WETH = address(this);
    }
    
    function factory() external view returns (address) {
        return _factory;
    }
    
    function WETH() external view returns (address) {
        return _WETH;
    }
    
    function getPair(address, address) external view returns (address) {
        // Return this contract's address for simplicity
        return address(this);
    }
    
    function createPair(address, address) external view returns (address) {
        // Return this contract's address for simplicity
        return address(this);
    }
    
    // Simplified version that just accepts the tokens but doesn't do anything
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external {
        // Do nothing in the mock
    }
    
    // Simplified version that just accepts the tokens but doesn't do anything
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        return (amountTokenDesired, msg.value, amountTokenDesired);
    }
}