# VestPump — Extras

## Demo Video

> *TODO: (Add your demo video link here once recorded)*

---

## Presentation / Slide Deck

> *TODO: (Add your slide deck link here)*

---

## Additional Links

| Resource | Link |
|---|---|
| BSC Testnet Explorer — TokenFactory | [0x3C3d0E...](https://testnet.bscscan.com/address/0x3C3d0E397065839e9d01a90bE04d01632062356C) |
| Deployment Tx | [0xf3b0dd...](https://testnet.bscscan.com/tx/0xf3b0dd9c29eea99f682756013fc02bd805f4ac38fd1364041ace9f2e3de3856a) |

---

## Notes for Judges

The best way to evaluate VestPump is to:

1. Review the smart contracts in [`src/packages/hardhat/contracts/`](../src/packages/hardhat/contracts/)
2. Follow the setup steps in [`docs/TECHNICAL.md`](TECHNICAL.md) to run it locally
3. Read the vesting formula and oracle logic explained in [`docs/PROJECT.md`](PROJECT.md)

The core innovation is the `VestingVault` + `MarketHealthOracle` interplay — feel free to start there.
