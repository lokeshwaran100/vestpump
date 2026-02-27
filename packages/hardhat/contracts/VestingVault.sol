// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IMarketHealthOracle {
    function getMarketHealthScore() external view returns (uint256);
    function getCurveCompletionFactor() external view returns (uint256);
}

contract VestingVault is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    IMarketHealthOracle public immutable oracle;

    // Basis points: 10000 = 100%
    uint256 public constant BASE_UNLOCK_RATE = 10000;
    uint256 public constant SCORE_DENOMINATOR = 10000;

    struct VestingSchedule {
        uint256 totalAllocated;
        uint256 amountClaimed;
    }

    mapping(address => VestingSchedule) public schedules;
    uint256 public totalLocked;

    event TokensAllocated(address indexed beneficiary, uint256 amount);
    event TokensClaimed(address indexed beneficiary, uint256 amount);

    constructor(
        address _token,
        address _oracle,
        address _owner
    ) Ownable(_owner) {
        require(_token != address(0), "Invalid token address");
        require(_oracle != address(0), "Invalid oracle address");
        token = IERC20(_token);
        oracle = IMarketHealthOracle(_oracle);
    }

    /**
     * @dev Called by the BondingCurveSale contract to lock tokens for a user.
     */
    function allocateVesting(address beneficiary, uint256 amount) external onlyOwner {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");

        schedules[beneficiary].totalAllocated += amount;
        totalLocked += amount;

        emit TokensAllocated(beneficiary, amount);
    }

    /**
     * @dev Calculates the total unlocked amount for a given user based on market health.
     */
    function calculateUnlockedAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory schedule = schedules[beneficiary];
        if (schedule.totalAllocated == 0) return 0;

        uint256 marketHealthScore = oracle.getMarketHealthScore();
        uint256 curveCompletionFactor = oracle.getCurveCompletionFactor();

        // Formula: Unlocked = Allocation * (BaseUnlockRate/10000) * (MarketHealthScore/10000) * (CurveCompletionFactor/10000)
        // Since BASE_UNLOCK_RATE is 10000 (100%), we can simplify
        uint256 unlocked = (schedule.totalAllocated * marketHealthScore * curveCompletionFactor) / (SCORE_DENOMINATOR * SCORE_DENOMINATOR);

        // Ensure we don't unlock more than allocated
        if (unlocked > schedule.totalAllocated) {
            return schedule.totalAllocated;
        }

        return unlocked;
    }

    /**
     * @dev Allows users to claim their vested tokens.
     */
    function claim() external {
        VestingSchedule storage schedule = schedules[msg.sender];
        require(schedule.totalAllocated > 0, "No allocation");

        uint256 totalUnlocked = calculateUnlockedAmount(msg.sender);
        uint256 claimable = totalUnlocked - schedule.amountClaimed;

        require(claimable > 0, "No tokens to claim right now");

        schedule.amountClaimed += claimable;
        totalLocked -= claimable;

        token.safeTransfer(msg.sender, claimable);

        emit TokensClaimed(msg.sender, claimable);
    }

    /**
     * @dev Get locked balance of a user
     */
    function getLockedAmount(address beneficiary) external view returns (uint256) {
        VestingSchedule memory schedule = schedules[beneficiary];
        uint256 totalUnlocked = calculateUnlockedAmount(beneficiary);
        return schedule.totalAllocated - totalUnlocked;
    }
}
