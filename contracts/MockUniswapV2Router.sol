// contracts/MockUniswapV2Router.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUniswapV2Router
 * @dev A more functional mock of a Uniswap V2 Router for testing purposes.
 * It simulates token transfers and ETH (WMATIC) handling.
 */
contract MockUniswapV2Router is ERC20("WMATIC", "WMATIC") {
    address private immutable _factory;
    address private immutable _WETH;
    
    // Mapping to simulate LNX token balances within this mock router
    mapping(address => uint256) public mockLnxBalances;

    constructor() {
        _factory = address(this);
        _WETH = address(this); // In a test environment, this mock acts as WMATIC
        
        // Mint some WMATIC to this contract for testing purposes
        _mint(address(this), 1000000000 * 10**18); // 1 Billion WMATIC
    }
    
    /**
     * @dev Returns the factory address
     */
    function factory() external view returns (address) {
        return _factory;
    }
    
    /**
     * @dev Returns the WETH address (which is this contract itself for testing)
     */
    function WETH() external view returns (address) {
        return _WETH;
    }
    
    // --- ERC20 Mocking for LNX token transfers to this router ---
    // When LNX token transfers to this router, it updates its internal mockLnxBalances
    function transfer(address recipient, uint256 amount) public override returns (bool) {
        mockLnxBalances[msg.sender] -= amount;
        mockLnxBalances[recipient] += amount;
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        mockLnxBalances[sender] -= amount;
        mockLnxBalances[recipient] += amount;
        // In a real scenario, allowance would be checked and reduced
        return true;
    }

    function balanceOf(address account) public view override returns (uint256) {
        // Return WMATIC balance for this contract, or mock LNX balance for others
        if (account == address(this)) {
            return super.balanceOf(account); // WMATIC balance of this router
        }
        return mockLnxBalances[account]; // Mock LNX balance
    }

    // --- Uniswap Router Function Mocks ---

    /**
     * @dev Mock implementation of addLiquidity
     * Transfers tokenA and tokenB to this contract and returns desired amounts.
     */
    function addLiquidity(
        address _tokenA,
        address _tokenB,
        uint _amountADesired,
        uint _amountBDesired,
        uint _amountAMin,
        uint _amountBMin,
        address _to,
        uint _deadline
    ) external pure returns (uint amountA, uint amountB, uint liquidity) {
        // Just return the desired amounts. All parameters are unused in this mock's logic.
        return (_amountADesired, _amountBDesired, _amountADesired);
    }
    
    /**
     * @dev Mock implementation of addLiquidityETH
     * Simulates receiving ETH and transferring tokens, then sending LP tokens.
     */
    function addLiquidityETH(
        address _token,
        uint _amountTokenDesired,
        uint _amountTokenMin,
        uint _amountETHMin,
        address _to,
        uint _deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity) {
        // Simulate transfer of `token` to this router
        // In a real router, tokens would be pulled via transferFrom
        // For this mock, we assume the LNX token has already been transferred to this router
        // or we simulate the transfer here.
        if (_token != _WETH) {
            // mockLnxBalances[msg.sender] -= amountTokenDesired; // Not needed if LNX is already here
        }

        // Simulate sending LP tokens to 'to' address
        // For simplicity, we just return the desired amount and the sent ETH
        return (_amountTokenDesired, msg.value, _amountTokenDesired); // Dummy liquidity amount
    }
    
    /**
     * @dev Mock implementation of swapExactTokensForTokensSupportingFeeOnTransferTokens
     * Simulates swapping `amountIn` of path[0] for `amountOutMin` of path[1].
     * Transfers `amountIn` from msg.sender to this contract.
     * Transfers `amountOutMin` of path[1] from this contract to `to`.
     */
    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint _amountIn,
        uint _amountOutMin,
        address[] calldata path,
        address _to,
        uint _deadline
    ) external {
        require(path.length == 2, "MockRouter: Only 2-hop swaps supported for simplicity");
        
        address tokenIn = path[0];
        address tokenOut = path[1];

        // Simulate transfer of tokenIn from sender to this router
        if (tokenIn == _WETH) {
            // If WMATIC is tokenIn, it means ETH was sent to this contract
            // For simplicity, we assume it's already here or sent via msg.value
        } else {
            // Assume LNX was already transferred to this router for swapping
            // mockLnxBalances[msg.sender] -= _amountIn; // Not needed if LNX is already here
        }

        // Simulate transfer of tokenOut from this router to recipient
        // If tokenOut is WMATIC, transfer native ETH
        if (tokenOut == _WETH) {
            payable(_to).transfer(_amountOutMin); // Simulate sending WMATIC (ETH)
        } else {
            // Transfer mock LNX from this router to recipient
            mockLnxBalances[address(this)] -= _amountOutMin;
            mockLnxBalances[_to] += _amountOutMin;
        }
    }
    
    /**
     * @dev Mock implementation of swapExactTokensForETHSupportingFeeOnTransferTokens
     * Simulates swapping `amountIn` of `token` for `amountOutMin` of ETH (WMATIC).
     * Transfers `amountIn` of `token` to this contract.
     * Transfers `amountOutMin` of ETH (WMATIC) from this contract to `to`.
     */
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint _amountIn,
        uint _amountOutMin,
        address[] calldata path,
        address _to,
        uint _deadline
    ) external {
        require(path.length == 2, "MockRouter: Only 2-hop swaps supported for simplicity");
        require(path[1] == _WETH, "MockRouter: Path[1] must be WETH");

        address tokenIn = path[0];

        // Simulate transfer of tokenIn (LNX) from sender to this router
        // Assume LNX was already transferred to this router for swapping
        // mockLnxBalances[msg.sender] -= _amountIn; // Not needed if LNX is already here

        // Simulate transfer of ETH (WMATIC) from this router to recipient
        // Ensure this mock has enough WMATIC balance
        require(super.balanceOf(address(this)) >= _amountOutMin, "MockRouter: Insufficient WMATIC balance for swap");
        super._transfer(address(this), _to, _amountOutMin); // Transfer WMATIC
    }
    
    /**
     * @dev Mock implementation of getPair
     * Returns a consistent address for the LNX/WMATIC pair.
     */
    function getPair(address tokenA, address tokenB) external view returns (address) {
        // For testing, we'll return a deterministic address for the LNX/WMATIC pair
        // This assumes LNX is always tokenA and WMATIC is always tokenB for the pair we care about.
        // In a real scenario, this would involve a factory lookup.
        if ((tokenA == address(0) && tokenB == _WETH) || (tokenA == _WETH && tokenB == address(0))) {
             // This is a placeholder for the actual LNX token address. In tests, address(0) is often used as a dummy.
             // For a more robust mock, you might pass the LNX token address to the constructor.
            return address(0x1000000000000000000000000000000000000001); // A dummy, deterministic pair address
        }
        return address(0); // No other pairs exist in this mock
    }
    
    /**
     * @dev Mock implementation of createPair
     * Returns a consistent address for the LNX/WMATIC pair.
     */
    function createPair(address _tokenA, address _tokenB) external view returns (address) {
        // For testing, we'll return a deterministic address for the LNX/WMATIC pair
        // This assumes LNX is always tokenA and WMATIC is always tokenB for the pair we care about.
        // In a real scenario, this would involve a factory creating a new pair.
        // The _tokenA and _tokenB parameters are unused in this mock's logic.
        if ((_tokenA == address(0) && _tokenB == _WETH) || (_tokenA == _WETH && _tokenB == address(0))) {
             // This is a placeholder for the actual LNX token address. In tests, address(0) is often used as a dummy.
             // For a more robust mock, you might pass the LNX token address to the constructor.
            return address(0x1000000000000000000000000000000000000001); // A dummy, deterministic pair address
        }
        return address(0); // Cannot create other pairs in this mock
    }
    
    // Required to receive ETH
    receive() external payable {
        // When ETH is sent to this router, it increases its internal WMATIC balance
        _mint(msg.sender, msg.value); // Simulate WMATIC minting upon receiving ETH
    }
}
