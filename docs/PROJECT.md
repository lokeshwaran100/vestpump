# VestPump — Project Overview

## 1. Problem Statement

Most token launch platforms optimize exclusively for **price discovery**, while ignoring the health of the token's circulating supply. The result is a well-known pattern in crypto:

- **Early dumping**: Insiders and early buyers sell immediately, crashing price at launch
- **Cliff-driven volatility**: Time-based vesting releases large tranches regardless of market conditions, creating artificial sell pressure
- **Misaligned economics**: Buyers have no incentive to hold; founders have no incentive to support the market long-term

Traditional vesting schedules are arbitrary — a token can fully unlock while the project is collapsing, rewarding exits over sustainability.

---

## 2. Solution

**VestPump** is a pump-style token launchpad with **market-earned vesting**. Token supply unlocks are dynamically controlled by real market signals — not clocks.

### Core Idea

> Replace time-based vesting cliffs with a continuous, market-responsive unlock rate.

### Key Features

- **Bonding curve fair launch**: Tokens are sold via a linear bonding curve. Price discovery is transparent and predictable.
- **Immediate vesting from block one**: Vesting starts the moment a user buys, even during the bonding curve phase.
- **No early transfers**: Tokens are locked in the `VestingVault` and cannot be transferred until the unlock formula allows it.
- **Market health gates supply**: The `MarketHealthOracle` produces a live score from on-chain signals that governs how fast tokens unlock.
- **Automatic DEX liquidity**: When the bonding curve target is met, collected BNB is automatically seeded into PancakeSwap as liquidity.
- **Sell during curve**: Buyers can sell tokens back to the bonding curve during the pre-DEX phase, getting BNB at the current spot price (tokens are burned, reducing supply).

### Unlock Formula

```
Unlocked = Allocation × MarketHealthScore × CurveCompletionFactor
```

| Variable | Range | Description |
|---|---|---|
| `Allocation` | — | Total tokens purchased by the user |
| `MarketHealthScore` | 0–1 (10000 bps) | Composite score from oracle |
| `CurveCompletionFactor` | 0–1 (10000 bps) | How much of the bonding curve is filled |

- During the bonding curve: `CurveCompletionFactor < 1`, acting as a natural brake
- After DEX launch: Score transitions to liquidity depth and TWAP deviation signals
- High volatility → lower score → slower unlocks
- Strong market → higher score → faster unlocks

---

## 3. Impact

| Stakeholder | Benefit |
|---|---|
| **Token Creators** | Credible, manipulation-resistant launches; prevents dump-at-launch |
| **Token Buyers** | Transparent, predictable rules; rewards holding in healthy markets |
| **Ecosystem** | Healthier token economies; reduces toxic liquidity cliffs |

VestPump aligns founder and buyer incentives: both parties benefit from maintaining a healthy, growing market.

---

## 4. Business Model (Potential)

- **Launch fee**: Small BNB fee per token launch via `TokenFactory`
- **Protocol cut**: Small percentage of liquidity bootstrapped to a protocol treasury
- **Premium features**: Advanced oracle integrations (Chainlink TWAP, DEX aggregators)

*(Not implemented in hackathon MVP — focus was correctness of mechanics)*

---

## 5. Limitations (Honest Assessment)

| Limitation | Notes |
|---|---|
| **MVP oracle accuracy** | Pre-DEX `MarketHealthScore` uses simplified on-chain proxies (buyer count, velocity), not real-time data |
| **No audit** | Contracts not audited; mainnet deployment would require a full audit |
| **Spot pricing on bonding curve** | Price calculation uses spot price approximation rather than a true integral of the curve; small mathematical rounding is possible |
| **Oracle access control** | For MVP, ownership was used over role-based access; a production version would implement granular roles |
| **No MEV/bot protection** | No front-run protection; production would require commit-reveal or similar |
| **Single-chain only** | Deployed on BSC Testnet only; no cross-chain support |

---

## 6. Roadmap (Post-Hackathon)

- [ ] Integrate Chainlink TWAP oracle for post-DEX health scoring
- [ ] Role-based access control (remove `Ownable` pattern)
- [ ] Multisig / governance for protocol parameters
- [ ] Audit by a reputable firm
- [ ] Mainnet deployment
- [ ] UI improvements: health score charts, unlock timeline visualization
- [ ] Cross-chain support (opBNB, Ethereum)
