# VestPump 🚀

**Market-Driven Token Vesting Launchpad on BNB Chain**

VestPump is a pump-style token launch platform with **market-driven vesting** — where token unlocks are *earned by market health*, not arbitrary time-based cliffs. It combines bonding curve–based fair launches with immediate, dynamic vesting that responds to real market signals.

> **Hackathon:** BNB Chain Hackathon  
> **Network:** BSC Testnet  
> **Built with:** Scaffold-ETH 2 · Solidity · Next.js · wagmi · Hardhat

---

## The Problem

Most token launch platforms optimize for price discovery alone, ignoring **circulating supply health**. Traditional time-based vesting leads to:

- 🔴 Early dumping at cliff dates
- 🔴 Liquidity collapse after unlock events
- 🔴 Misaligned incentives between founders and buyers

## The Solution

VestPump replaces arbitrary time-based vesting with **market-earned supply unlocks**:

- ✅ Bonding curve–based fair launch (buy-only during curve)
- ✅ Vesting begins **immediately** at purchase — even during the bonding curve
- ✅ Unlock rate dynamically adjusts based on market health score
- ✅ Automatic DEX liquidity seeding once the curve completes

### Unlock Formula

```
Unlocked = Allocation × MarketHealthScore × CurveCompletionFactor
```

- `CurveCompletionFactor` starts low and rises as the bonding curve fills
- `MarketHealthScore` is computed from buyer count, velocity, liquidity depth, and price stability
- No time-based cliff — the market decides when users can transfer tokens

---

## Repository Structure

```
/README.md            ← This file
/bsc.address          ← Deployed contract addresses on BSC Testnet
/docs/
    PROJECT.md        ← Problem, solution, business model, limitations
    TECHNICAL.md      ← Architecture, setup guide, demo walkthrough
    EXTRAS.md         ← Demo video & presentation links
/src/                 ← Full project source (Scaffold-ETH 2 monorepo)
    packages/
        hardhat/      ← Smart contracts, deploy scripts, tests
        nextjs/       ← Frontend application
/test/                ← Additional test files
```

---

## Quick Start

```bash
cd src
yarn install
yarn start        # Starts the Next.js frontend
```

See [`docs/TECHNICAL.md`](docs/TECHNICAL.md) for full setup including contract deployment.

---

## Smart Contracts (BSC Testnet)

| Contract | Address |
|---|---|
| TokenFactory | `0x3C3d0E397065839e9d01a90bE04d01632062356C` |

See [`bsc.address`](bsc.address) for full deployment details.

---

## Documentation

| Document | Contents |
|---|---|
| [`docs/PROJECT.md`](docs/PROJECT.md) | Problem, solution, business case, limitations, roadmap |
| [`docs/TECHNICAL.md`](docs/TECHNICAL.md) | Architecture, setup, contract guide, demo steps |
| [`docs/EXTRAS.md`](docs/EXTRAS.md) | Demo video & presentation links |

---

## License

MIT
