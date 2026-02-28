# VestPump — Technical Documentation

## 1. Architecture Overview

VestPump uses a **factory pattern**: one `TokenFactory` deployment creates a complete suite of contracts for each token launch.

```
TokenFactory
├── deploys → PumpToken        (ERC20, controlled mint/burn)
├── deploys → MarketHealthOracle (computes health score)
├── deploys → VestingVault     (locks tokens, enforces unlock rules)
├── deploys → LiquidityBootstrapper (seeds DEX on curve completion)
└── deploys → BondingCurveSale (handles buy/sell, drives the system)
```

### Contract Interaction Flow

```
User ──buy()──→ BondingCurveSale
                    │
                    ├──mint()──────→ PumpToken
                    │                   │ (minted directly to vault)
                    ├──allocate()──→ VestingVault ←── oracle.getScore()
                    │
                    └──updateMetrics()──→ MarketHealthOracle
                         (curve completion %, buyer count, velocity)

When curve target hit:
BondingCurveSale ──bootstrapLiquidity()──→ LiquidityBootstrapper
                                               └──addLiquidityETH()──→ PancakeSwap V2

User ──claim()──→ VestingVault
                    └── calculates unlocked = allocation × healthScore × curveFactor
                    └── transfers unlocked - already claimed tokens
```

---

## 2. Smart Contracts

### `PumpToken.sol`
Standard ERC20 with a single designated `minter` (set to `BondingCurveSale`). Only the minter can mint or burn tokens. This ensures supply is always coupled to real purchases.

### `BondingCurveSale.sol`
The central contract driving the launch:
- **Buy**: Accepts BNB, computes token amount via linear bonding curve, mints tokens directly to `VestingVault`, and records user allocation
- **Sell**: Burns tokens from seller (requires prior `approve`), returns BNB at current spot price; only available before curve completes
- **Completion**: Triggers when `bnbRaised >= TARGET_RAISE` (50 BNB) or `tokensSold >= MAX_SUPPLY` (1B tokens); seeds liquidity via `LiquidityBootstrapper`

**Bonding Curve Parameters:**
| Parameter | Value |
|---|---|
| `MAX_SUPPLY` | 1,000,000,000 tokens |
| `TARGET_RAISE` | 50 BNB |
| `INITIAL_PRICE` | 0.00000001 BNB/token |
| `FINAL_PRICE` | 0.0000001 BNB/token (10× at end) |

Price formula: `P(x) = INITIAL_PRICE + (FINAL_PRICE - INITIAL_PRICE) × (tokensSold / MAX_SUPPLY)`

### `VestingVault.sol`
Core vesting logic:
- Receives allocated token balances from `BondingCurveSale`
- `calculateUnlockedAmount(user)`: `allocation × healthScore × curveFactor / (10000 × 10000)`
- `claim()`: Transfers `totalUnlocked - alreadyClaimed` to user
- `getLockedAmount(user)`: Returns still-locked balance for UI display

### `MarketHealthOracle.sol`
Produces a composite market health score (0–10000 bps):

**Pre-DEX scoring:**
```
baseScore = 5000
buyerBonus = min(uniqueBuyers × 200, 2000)   // up to +2000 bps for ≥10 buyers
momentumBonus = min(buyVelocity × 30, 3000)  // up to +3000 bps for ≥100 buys
score = min(baseScore + buyerBonus + momentumBonus, 10000)
```

**Post-DEX scoring:**
```
baseScore = 7000
penalty = min(twapDeviation, 5000)           // TWAP deviation hurts score
liquidityBonus = liquidityDepth × 3000 / 10e18 // rewards deep liquidity
score = min(baseScore + liquidityBonus - penalty, 10000)
```

### `LiquidityBootstrapper.sol`
Called once by `BondingCurveSale` upon curve completion:
- Approves `PancakeSwap V2 Router` to spend tokens
- Calls `addLiquidityETH` with 50% of raised BNB and remaining token supply
- LP tokens go to the project creator
- Emits `LiquidityAdded` event marking the DEX-live state

### `TokenFactory.sol`
One-transaction launcher:
- Deploys all 5 contracts with correct wiring
- Transfers final ownership of `PumpToken` and `BondingCurveSale` to the creator
- Transfers `LiquidityBootstrapper` ownership to creator (for LP withdrawal)
- `BondingCurveSale` owns `VestingVault` and `MarketHealthOracle` during the sale phase

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Solidity ^0.8.20, OpenZeppelin |
| Development Framework | Scaffold-ETH 2 (Hardhat + Next.js) |
| Frontend | Next.js (App Router), wagmi, viem |
| Testing | Hardhat test suite |
| Network | BSC Testnet (DEX: PancakeSwap V2) |

---

## 4. Setup & Running Locally

### Prerequisites

- Node.js >= 20.18.3
- Yarn (v1 or v2+)
- Git
- A wallet with BSC Testnet BNB (get from [faucet](https://testnet.bnbchain.org/faucet-smart))

### Install Dependencies

```bash
git clone <your-repo-url>
cd vestpump/src
yarn install
```

### Start the Frontend

The frontend is already configured to connect to the BSC Testnet deployment:

```bash
yarn start
```

Visit: **http://localhost:3000**

### Deploy Contracts (Optional — Already Deployed)

To redeploy to BSC Testnet yourself:

```bash
# Set your private key in src/packages/hardhat/.env
# DEPLOYER_PRIVATE_KEY=0x...

cd src
yarn deploy --network bscTestnet
```

The deploy script is at `src/packages/hardhat/deploy/`.

### Run Tests

```bash
cd src
yarn hardhat:test
```

---

## 5. Demo Guide

Follow these steps to see the full VestPump lifecycle:

### Step 1: Connect Wallet
- Open http://localhost:3000
- Connect your MetaMask (set to BSC Testnet, Chain ID 97)
- Ensure you have some BSC Testnet BNB. (Use faucet: https://hackathon-faucet.vercel.app/)

### Step 2: Create a Token
- Navigate to the **Create** page
- Enter a token name and symbol (e.g., "Demo Token" / "DEMO")
- Click **Launch Token**
- Approve the transaction — this deploys the full contract suite via `TokenFactory`
- Note the deployed contract addresses from the `TokenLaunched` event

### Step 3: Buy Tokens via Bonding Curve
- Navigate to the token's **Launchpad** page
- Enter a BNB amount and click **Buy**
- Observe: tokens are minted and immediately locked in the VestingVault
- The UI shows your **Locked** and **Claimable Now** balances

### Step 4: Observe Vesting in Action
- Check your **Claimable Now** balance — it starts low (low health score × low curve completion)
- The more buyers participate, the higher the health score, the more unlocks

### Step 5: Claim Unlocked Tokens
- Click **Claim** to withdraw currently unlocked tokens
- The transaction calls `VestingVault.claim()` and transfers vested tokens to your wallet

### Step 6: Sell During Curve (Optional)
- Switch to the **Sell** tab on the launchpad
- Enter the amount of tokens to sell, then click **Approve** (first time only)
- Click **Sell** — tokens are burned, BNB is returned at the current curve spot price

### Step 7: Complete the Curve
- Once 50 BNB is raised, the curve auto-completes
- Liquidity is automatically seeded to PancakeSwap
- The oracle switches to DEX-based health scoring
- Vesting continues with potentially higher unlock rates if the market is healthy

---

## 6. Key Contract Addresses (BSC Testnet)

See [`bsc.address`](../bsc.address) for full deployment details.

| Contract | Address |
|---|---|
| TokenFactory | `0x3C3d0E397065839e9d01a90bE04d01632062356C` |
| PancakeSwap V2 Router | `0xD99D1c33F9fC3444f8101754aBC46c52416550D1` |

---

## 7. Project Source Layout

```
src/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   ├── PumpToken.sol
│   │   │   ├── BondingCurveSale.sol
│   │   │   ├── VestingVault.sol
│   │   │   ├── MarketHealthOracle.sol
│   │   │   ├── LiquidityBootstrapper.sol
│   │   │   └── TokenFactory.sol
│   │   ├── deploy/
│   │   ├── test/
│   │   └── hardhat.config.ts
│   └── nextjs/
│       └── app/
│           ├── page.tsx           ← Home / token list
│           ├── create/            ← Token creation page
│           └── launchpad/         ← Token buy/sell/claim page
```
