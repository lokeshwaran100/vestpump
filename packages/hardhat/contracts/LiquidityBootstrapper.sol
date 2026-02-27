// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./MarketHealthOracle.sol";

// Minimal interface for Uniswap V2 Router
interface IUniswapV2Router02 {
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
}

contract LiquidityBootstrapper is Ownable {
    IUniswapV2Router02 public immutable router;
    IERC20 public immutable token;
    MarketHealthOracle public immutable oracle;

    bool public liquidityAdded;

    event LiquidityAdded(uint256 bnbAmount, uint256 tokenAmount, uint256 liquidityTokens);

    // Hardcode Uniswap V2 testnet router or pass in constructor
    constructor(
        address _token,
        address _oracle,
        address _router,
        address _owner
    ) Ownable(_owner) {
        token = IERC20(_token);
        oracle = MarketHealthOracle(_oracle);
        // BSC Testnet PancakeSwap Router: 0x9Ac64Cc6e4415144C455BD8E4837Fea55603e5c3
        router = IUniswapV2Router02(_router);
    }

    /**
     * @dev Called by BondingCurveSale to add collected funds to DEX
     */
    function bootstrapLiquidity(uint256 bnbAmount, uint256 tokenAmount) external payable {
        // Only allowed to be called once by the trusted sale contract
        // In a full implementation, we'd use Role-based access or require msg.sender == saleContract
        // For hackathon MVP, we just check it hasn't been added yet and the sender has provided BNB
        require(!liquidityAdded, "Already added");
        require(msg.value == bnbAmount, "BNB amount mismatch");

        liquidityAdded = true;

        // Approve router
        token.approve(address(router), tokenAmount);

        // Add liquidity
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = router.addLiquidityETH{value: bnbAmount}(
            address(token),
            tokenAmount,
            0, // slgippage is 100% since we are the first to add
            0,
            owner(), // Send LP tokens to project owner
            block.timestamp + 300
        );

        emit LiquidityAdded(amountETH, amountToken, liquidity);
    }
}
