import { expect } from "chai";
import { ethers } from "hardhat";
import { BondingCurveSale, LiquidityBootstrapper, MarketHealthOracle, PumpToken, VestingVault } from "../typechain-types";

describe("VestPump Core Logic", function () {
    let token: PumpToken;
    let oracle: MarketHealthOracle;
    let vault: VestingVault;
    let bootstrapper: LiquidityBootstrapper;
    let sale: BondingCurveSale;

    let owner: any;
    let buyer1: any;
    let buyer2: any;

    beforeEach(async () => {
        [owner, buyer1, buyer2] = await ethers.getSigners();

        // Deploy mock router or just use a dummy address for testing
        // To fully test router we'd need a mock Uniswap router
        const dummyRouter = ethers.Wallet.createRandom().address;

        const TokenFactory = await ethers.getContractFactory("TokenFactory");
        const factory = await TokenFactory.deploy(dummyRouter);
        await factory.waitForDeployment();

        // Create a new token launch
        const tx = await factory.createTokenLaunch("TestToken", "TST");
        const receipt = await tx.wait();

        // Parse events to get addresses
        // The Event TokenLaunched is emitted
        const log = receipt?.logs.find(
            (l: any) => l.fragment && l.fragment.name === "TokenLaunched"
        );

        if (log && log.args) {
            token = await ethers.getContractAt("PumpToken", log.args[0]) as unknown as PumpToken;
            sale = await ethers.getContractAt("BondingCurveSale", log.args[1]) as unknown as BondingCurveSale;
            vault = await ethers.getContractAt("VestingVault", log.args[2]) as unknown as VestingVault;
            oracle = await ethers.getContractAt("MarketHealthOracle", log.args[3]) as unknown as MarketHealthOracle;
            bootstrapper = await ethers.getContractAt("LiquidityBootstrapper", log.args[4]) as unknown as LiquidityBootstrapper;
        } else {
            throw new Error("Failed to find TokenLaunched event");
        }
    });

    it("Should set correct ownership", async function () {
        expect(await token.owner()).to.equal(owner.address);
        expect(await sale.owner()).to.equal(owner.address);
        expect(await vault.owner()).to.equal(await sale.getAddress()); // vault owned by sale
        expect(await oracle.owner()).to.equal(await sale.getAddress()); // oracle owned by sale
    });

    it("Should allow a user to buy tokens, lock them, and claim based on health score", async function () {
        const buyAmount = ethers.parseEther("1"); // 1 BNB

        // Initial state
        const initialTokensSold = await sale.tokensSold();

        await sale.connect(buyer1).buyTokens({ value: buyAmount });

        // Check tokens were sold
        const newTokensSold = await sale.tokensSold();
        expect(newTokensSold).to.be.gt(initialTokensSold);

        // Check user's allocation
        const schedule = await vault.schedules(buyer1.address);
        expect(schedule.totalAllocated).to.equal(newTokensSold);

        const completionFactor = await oracle.getCurveCompletionFactor();
        expect(completionFactor).to.be.gt(0);

        const unlocked = await vault.calculateUnlockedAmount(buyer1.address);
        expect(unlocked).to.be.gt(0); // since completion factor > 0 and base score > 0

        const initialBalance = await token.balanceOf(buyer1.address);

        await vault.connect(buyer1).claim();

        const finalBalance = await token.balanceOf(buyer1.address);
        expect(finalBalance).to.be.gt(initialBalance);
        expect(finalBalance - initialBalance).to.equal(unlocked);
    });

    it("Cannot claim more than unlocked", async function () {
        const buyAmount = ethers.parseEther("1"); // 1 BNB
        await sale.connect(buyer1).buyTokens({ value: buyAmount });

        // First claim should succeed
        await vault.connect(buyer1).claim();

        // Second immediate claim should fail
        await expect(vault.connect(buyer1).claim()).to.be.revertedWith("No tokens to claim right now");
    });
});
