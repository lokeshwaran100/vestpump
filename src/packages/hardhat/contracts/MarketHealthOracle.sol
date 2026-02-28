// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MarketHealthOracle is Ownable {
    uint256 public constant MAX_SCORE = 10000; // 100% in bps

    bool public isDexLive;
    
    // Pre-DEX metrics
    uint256 public currentCurveCompletionFactor; // 0 to 10000
    uint256 public uniqueBuyers;
    uint256 public buyVelocity; // buys per hour/day etc.

    // Post-DEX metrics
    uint256 public liquidityDepth;
    uint256 public twapDeviation; // deviation from spot price

    event CurveProgressUpdated(uint256 newCompletionFactor);
    event DexActivated(uint256 initialLiquidity);
    event MetricsUpdated(uint256 uniqueBuyers, uint256 buyVelocity);
    event PostDexMetricsUpdated(uint256 liquidityDepth, uint256 twapDeviation);

    constructor(address _owner) Ownable(_owner) {}

    /**
     * @dev Called by BondingCurveSale to update progress
     */
    function updateCurveProgress(uint256 newCompletionFactor) external onlyOwner {
        require(newCompletionFactor <= MAX_SCORE, "Max 100%");
        currentCurveCompletionFactor = newCompletionFactor;
        emit CurveProgressUpdated(newCompletionFactor);
    }

    /**
     * @dev Called by BondingCurveSale to update buyer metrics
     */
    function updatePreDexMetrics(uint256 _uniqueBuyers, uint256 _buyVelocity) external onlyOwner {
        uniqueBuyers = _uniqueBuyers;
        buyVelocity = _buyVelocity;
        emit MetricsUpdated(_uniqueBuyers, _buyVelocity);
    }

    /**
     * @dev Called by LiquidityBootstrapper when DEX launches
     */
    function activateDex(uint256 initialLiquidity) external onlyOwner {
        isDexLive = true;
        liquidityDepth = initialLiquidity;
        currentCurveCompletionFactor = MAX_SCORE; // Curve is 100% complete
        emit DexActivated(initialLiquidity);
    }

    /**
     * @dev Updates post-DEX metrics (mock implementation for MVP)
     */
    function updatePostDexMetrics(uint256 _liquidityDepth, uint256 _twapDeviation) external onlyOwner {
        require(isDexLive, "DEX not live yet");
        liquidityDepth = _liquidityDepth;
        twapDeviation = _twapDeviation;
        emit PostDexMetricsUpdated(_liquidityDepth, _twapDeviation);
    }

    /**
     * @dev Returns the curve completion factor (0-10000 bps)
     */
    function getCurveCompletionFactor() external view returns (uint256) {
        return currentCurveCompletionFactor;
    }

    /**
     * @dev Returns the composite market health score (0-10000 bps)
     */
    function getMarketHealthScore() external view returns (uint256) {
        if (!isDexLive) {
            // Pre-DEX: Health is based on curve progress and buyer engagement
            // For MVP: Simple base score + momentum bonus
            uint256 baseScore = 5000; // 50% baseline during curve
            
            // Bonus for having > 10 distinct buyers (up to 2000 bps)
            uint256 buyerBonus = uniqueBuyers >= 10 ? 2000 : (uniqueBuyers * 200);
            
            // Simulate momentum (up to 3000 bps) - assumes buyVelocity is a good number
            uint256 momentumBonus = buyVelocity >= 100 ? 3000 : (buyVelocity * 30);
            
            uint256 totalScore = baseScore + buyerBonus + momentumBonus;
            return totalScore > MAX_SCORE ? MAX_SCORE : totalScore;
        } else {
            // Post-DEX: Health relies on liquidity and low volatility
            uint256 baseScore = 7000;
            
            // Penalty for high TWAP deviation (0 to 5000 bps penalty)
            // e.g., if deviation is 5% (500 bps), penalty is 500
            uint256 penalty = twapDeviation > 5000 ? 5000 : twapDeviation;
            
            // Bonus for good liquidity depth
            uint256 liquidityBonus = liquidityDepth > 10 ether ? 3000 : (liquidityDepth * 3000) / 10 ether;
            
            uint256 finalScore = baseScore + liquidityBonus;
            if (penalty >= finalScore) return 0; // Extremely unhealthy
            
            finalScore -= penalty;
            
            return finalScore > MAX_SCORE ? MAX_SCORE : finalScore;
        }
    }
}
