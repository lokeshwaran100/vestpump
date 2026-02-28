# 📄 Product Requirements Document (PRD)
## Project: VestPump  
### Market-Driven Token Vesting Launchpad

**Target Network:** BSC Testnet (BNB Chain)  
**Development Framework:** scaffold-eth 2  
**Hackathon Scope:** MVP (48-hour build)

---

## 1. Problem Statement

Most token launch platforms optimize only for **price discovery**, not **circulating supply health**.  
Traditional time-based vesting schedules ignore real market conditions, leading to:

- Early dumping
- Liquidity cliffs
- Unsustainable token economies

---

## 2. Solution Overview

**VestPump** is a pump-style token launch platform with **market-driven vesting enabled from minute one**.

It combines:
- Bonding curve–based fair launches
- Immediate vesting (even during bonding curve)
- No early selling or transfers before DEX liquidity

Token supply unlocks are **earned by market health**, not by time.

---

## 3. Goals & Non-Goals

### Goals
- Launch ERC20 tokens using bonding curve price discovery
- Enforce vesting immediately upon purchase
- Dynamically control circulating supply using market signals
- Deploy and demonstrate on BSC Testnet

### Non-Goals
- Advanced anti-bot or MEV protection
- Cross-chain deployments
- Revenue sharing or buyback mechanics
- Mainnet-grade audits

---

## 4. User Personas

### Token Creator
- Wants fair distribution
- Wants to prevent early dumping
- Needs a simple launch experience

### Token Buyer
- Wants transparent, predictable rules
- Accepts lockups if they are market-driven
- Wants visibility into unlock conditions

---

## 5. User Flow

### 5.1 Token Creation
1. Creator inputs:
   - Token name
   - Symbol
   - Max supply
   - Bonding curve parameters
2. Platform deploys:
   - ERC20 token
   - BondingCurveSale contract
   - VestingVault contract

---

### 5.2 Bonding Curve Phase
- Users can **buy tokens only**
- Tokens are:
  - Minted
  - Locked inside VestingVault
  - Non-transferable
- Vesting begins immediately at a conservative rate

---

### 5.3 Curve Completion
Triggered when:
- Target raise is reached, or
- Max curve supply is sold

Actions:
- Bonding curve is disabled
- Liquidity is added to a DEX
- Market health metrics switch to DEX-based inputs
- Vesting accelerates if market conditions are healthy

---

## 6. Functional Requirements

### 6.1 BondingCurveSale Contract

**Responsibilities**
- Accept BNB
- Calculate token price via a linear bonding curve
- Mint tokens directly to VestingVault
- Track total raised and curve progress

**Constraints**
- Buy-only (no selling)
- Tokens are non-transferable
- Curve is disabled permanently after completion

---

### 6.2 VestingVault Contract (Core Contract)

**Responsibilities**
- Hold all user token allocations
- Enforce vesting and unlock rules
- Prevent transfers of locked tokens
- Expose locked vs unlocked balances

**Key Rule**
> Vesting is active even while the bonding curve is running.

---

### 6.3 MarketHealthOracle Contract

**Pre-DEX Metrics**
- Bonding curve completion percentage
- Buy transaction velocity
- Unique buyer count

**Post-DEX Metrics**
- Liquidity depth
- Price volatility (TWAP deviation)

**Output**
- `marketHealthScore` ∈ [0, 1]

---

### 6.4 LiquidityBootstrapper

- Adds liquidity once the bonding curve completes
- Uses raised funds for initial liquidity
- Emits an event indicating DEX-live state

---

## 7. Vesting Logic

### Unlock Formula

```

Unlocked =
Allocation
× BaseUnlockRate
× MarketHealthScore
× CurveCompletionFactor

```

### Properties
- `CurveCompletionFactor < 1` while bonding curve is active
- Unlocking slows automatically during high volatility
- No time-based cliffs

---

## 8. Smart Contract Architecture

```

TokenFactory
├── BondingCurveSale
├── VestingVault
├── MarketHealthOracle
└── LiquidityBootstrapper

```

---

## 9. Technical Stack

### Smart Contracts
- Solidity ^0.8.x
- OpenZeppelin ERC20
- Custom bonding curve and vesting logic

### Frontend
- Next.js (scaffold-eth 2 default)
- wagmi + viem
- Pump-style minimal UI

### Tooling
- scaffold-eth 2
- Hardhat
- Foundry (optional)

---

## 10. Deployment Requirements (BSC Testnet)

- Network: BSC Testnet
- Faucet-funded deployer wallet
- Minimum on-chain activity:
  - 2 successful bonding curve buys
  - 1 vesting unlock event
- Contract verification is optional but encouraged

---

## 11. UX Requirements

### Must Display
- Bonding curve progress
- Locked vs unlocked supply
- Market health score
- Explanation for slow or paused vesting

### Must Prevent
- Token transfers before unlock
- Early selling
- Hidden vesting mechanics

---

## 12. Open Source Requirements

- Public GitHub repository
- MIT license
- README including:
  - Architecture overview
  - Vesting formula explanation
  - Demo instructions

---

## 13. Demo Script (Mandatory)

1. Create a new token
2. Buy tokens via bonding curve
3. Show tokens locked in VestingVault
4. Show vesting active during curve
5. Complete bonding curve
6. Add DEX liquidity
7. Vesting accelerates
8. Transfer becomes possible

---

## 14. Success Metrics

- Contracts deployed on BSC Testnet
- Vesting enforced on-chain
- Clear, intuitive UI
- Live demo without mocks

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|----|----|
| Vesting confusion | Clear UI explanations |
| Over-complex math | Linear scoring & weights |
| Hackathon time limits | Scope control |

---

## 16. Milestones (48 Hours)

### Day 1
- Core contracts
- Bonding curve logic
- VestingVault implementation

### Day 2
- Frontend integration
- Deployment to BSC Testnet
- Demo preparation

---

## 17. Hackathon Positioning Statement

> VestPump replaces arbitrary time-based vesting with market-earned supply, aligning founders, buyers, and liquidity from day one.