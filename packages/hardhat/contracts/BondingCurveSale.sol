// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./VestingVault.sol";
import "./MarketHealthOracle.sol";
import "./PumpToken.sol";

interface ILiquidityBootstrapper {
    function bootstrapLiquidity(uint256 bnbAmount, uint256 tokenAmount) external payable;
}

contract BondingCurveSale is Ownable {
    IERC20 public immutable token;
    VestingVault public immutable vault;
    MarketHealthOracle public immutable oracle;
    ILiquidityBootstrapper public bootstrapper;

    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 Billion tokens
    uint256 public constant TARGET_RAISE = 50 ether; // e.g. 50 BNB target
    
    // Simple linear curve params: P(x) = m*x + b
    uint256 public constant INITIAL_PRICE = 0.00000001 ether; // 1 token = 0.00000001 BNB
    uint256 public constant FINAL_PRICE = 0.0000001 ether; // 10x price at the end

    uint256 public tokensSold;
    uint256 public bnbRaised;
    bool public saleEnded;

    // Track unique buyers
    mapping(address => bool) public hasBought;
    uint256 public uniqueBuyersCount;
    uint256 public buyVelocity; // Simplified velocity counter

    event TokensPurchased(address indexed buyer, uint256 bnbAmount, uint256 tokenAmount);
    event SaleCompleted(uint256 totalBnbRaised, uint256 totalTokensSold);

    constructor(
        address _token,
        address _vault,
        address _oracle,
        address _bootstrapper,
        address _owner
    ) Ownable(_owner) {
        token = IERC20(_token);
        vault = VestingVault(_vault);
        oracle = MarketHealthOracle(_oracle);
        bootstrapper = ILiquidityBootstrapper(_bootstrapper);
    }

    /**
     * @dev Buy tokens via the bonding curve.
     */
    function buyTokens() external payable {
        require(!saleEnded, "Sale has ended");
        require(msg.value > 0, "Must send BNB");

        // Calculate current price based on completion percentage
        uint256 completionFactor = (tokensSold * 10000) / MAX_SUPPLY;
        uint256 currentPrice = INITIAL_PRICE + ((FINAL_PRICE - INITIAL_PRICE) * completionFactor) / 10000;
        
        // Calculate amount of tokens to buy
        // In reality this should be an integral of the pricing curve but for hackathon MVP we use spot pricing
        uint256 tokenAmount = (msg.value * 10**18) / currentPrice;

        require(tokensSold + tokenAmount <= MAX_SUPPLY, "Exceeds max supply");

        // Process purchase
        tokensSold += tokenAmount;
        bnbRaised += msg.value;

        // Update metrics
        if (!hasBought[msg.sender]) {
            hasBought[msg.sender] = true;
            uniqueBuyersCount++;
        }
        buyVelocity++;

        // Update oracle progress (must be called by owner via factory/script or here if we grant roles)
        // For hackathon MVP we'll call oracle directly but owner needs to be set properly
        // Ideally Oracle should allow BondingCurve to call it
        try oracle.updateCurveProgress((tokensSold * 10000) / MAX_SUPPLY) {} catch {}
        try oracle.updatePreDexMetrics(uniqueBuyersCount, buyVelocity) {} catch {}

        // Mint/allocate to vault
        // Vault needs tokens to lock
        PumpToken(address(token)).mint(address(vault), tokenAmount);
        vault.allocateVesting(msg.sender, tokenAmount);

        emit TokensPurchased(msg.sender, msg.value, tokenAmount);

        // Check completion
        if (bnbRaised >= TARGET_RAISE || tokensSold >= MAX_SUPPLY) {
            _completeSale();
        }
    }

    /**
     * @dev Internal function to handle curve completion and DEX transition
     */
    function _completeSale() internal {
        saleEnded = true;
        emit SaleCompleted(bnbRaised, tokensSold);

        // Bootstrap liquidity (e.g. 50% of BNB raised and remaining token supply)
        uint256 liquidityBnb = bnbRaised / 2;
        uint256 remainingTokens = token.balanceOf(address(this));
        
        token.approve(address(bootstrapper), remainingTokens);
        bootstrapper.bootstrapLiquidity{value: liquidityBnb}(liquidityBnb, remainingTokens);

        // Activate DEX in oracle
        try oracle.activateDex(liquidityBnb) {} catch {}
    }

    /**
     * @dev Allows withdrawal of remaining dev funds after liquidity
     */
    function withdrawDevFunds() external onlyOwner {
        require(saleEnded, "Sale not ended");
        uint256 balance = address(this).balance;
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdraw failed");
    }
}
