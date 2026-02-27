"use client";

import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { ChartBarIcon, CurrencyDollarIcon, LockClosedIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// In a real app we would read this from the URL or a shared context
// For hackathon MVP, we hardcode the deployed contract address after launching via home page
const MOCK_SALE_ADDRESS = "0xYourSaleAddressHere"; // Replace with actual Sale Address
const MOCK_VAULT_ADDRESS = "0xYourVaultAddressHere"; // Replace with actual Vault Address
const MOCK_ORACLE_ADDRESS = "0xYourOracleAddressHere"; // Replace with actual Oracle Address

const Launchpad: NextPage = () => {
    const { address: connectedAddress } = useAccount();
    const [buyAmount, setBuyAmount] = useState("");

    // Read Sale State
    const { data: tokensSold } = useScaffoldReadContract({
        contractName: "BondingCurveSale",
        functionName: "tokensSold",
    });

    const { data: bnbRaised } = useScaffoldReadContract({
        contractName: "BondingCurveSale",
        functionName: "bnbRaised",
    });

    const { data: saleEnded } = useScaffoldReadContract({
        contractName: "BondingCurveSale",
        functionName: "saleEnded",
    });

    // Read Oracle State
    const { data: healthScore } = useScaffoldReadContract({
        contractName: "MarketHealthOracle",
        functionName: "marketHealthScore",
    });

    // Write Actions
    const { writeContractAsync: writeSale } = useScaffoldWriteContract("BondingCurveSale");
    const { writeContractAsync: writeVault } = useScaffoldWriteContract("VestingVault");

    const maxSupply = 1_000_000_000;
    const tokensSoldFormatted = tokensSold ? Number(formatEther(tokensSold)) : 0;
    const progressPercent = Math.min((tokensSoldFormatted / maxSupply) * 100, 100);

    const handleBuy = async () => {
        if (!buyAmount || isNaN(Number(buyAmount))) return;
        try {
            await writeSale({
                functionName: "buyTokens",
                value: parseEther(buyAmount),
            });
            setBuyAmount("");
        } catch (e) {
            console.error("Error buying tokens:", e);
        }
    };

    const handleClaim = async () => {
        try {
            await writeVault({
                functionName: "claim",
            });
        } catch (e) {
            console.error("Error claiming tokens:", e);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4 bg-base-200">
            <h1 className="text-4xl font-bold mb-8">Token Launch Dashboard</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">

                {/* Bonding Curve Section */}
                <div className="bg-base-100 shadow-xl rounded-3xl p-6 border border-base-300">
                    <div className="flex items-center gap-2 mb-4">
                        <ChartBarIcon className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold m-0">Bonding Curve Phase</h2>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between mb-2 text-sm font-medium">
                            <span>Progress</span>
                            <span>{progressPercent.toFixed(2)}%</span>
                        </div>
                        <progress className="progress progress-primary w-full h-4" value={progressPercent} max="100"></progress>
                        <p className="text-sm text-gray-500 mt-2">
                            {tokensSoldFormatted.toLocaleString()} / {maxSupply.toLocaleString()} Tokens Sold
                        </p>
                    </div>

                    {saleEnded ? (
                        <div className="alert alert-success shadow-lg">
                            <CheckCircleIcon className="w-6 h-6" />
                            <div>
                                <h3 className="font-bold">Sale Completed!</h3>
                                <div className="text-xs">Liquidity Bootstrapped to DEX.</div>
                            </div>
                        </div>
                    ) : (
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text font-semibold">Buy Tokens</span>
                            </label>
                            <label className="input-group">
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Amount in BNB"
                                    className="input input-bordered w-full"
                                    value={buyAmount}
                                    onChange={(e) => setBuyAmount(e.target.value)}
                                />
                                <button className="btn btn-primary" onClick={handleBuy}>
                                    Buy
                                </button>
                            </label>
                            <p className="text-xs mt-2 opacity-70">
                                Tokens are sent instantly to your Vesting Vault.
                            </p>
                        </div>
                    )}
                </div>

                {/* Vesting Section */}
                <div className="bg-base-100 shadow-xl rounded-3xl p-6 border border-base-300">
                    <div className="flex flex-col h-full justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <LockClosedIcon className="w-6 h-6 text-secondary" />
                                    <h2 className="text-2xl font-bold m-0">Your Vesting</h2>
                                </div>
                                <div className="badge badge-accent badge-lg">
                                    Health Score: {healthScore ? (Number(healthScore) / 100).toFixed(2) : "0"}%
                                </div>
                            </div>

                            <p className="text-sm opacity-80 mb-6">
                                Your tokens are locked. They unlock block-by-block based on market health. If the curve completes and the DEX thrives, unlocks accelerate!
                            </p>

                            <div className="stats shadow bg-base-200 w-full mb-6">
                                <div className="stat place-items-center">
                                    <div className="stat-title">Locked Balance</div>
                                    <div className="stat-value text-secondary text-2xl">--</div>
                                </div>

                                <div className="stat place-items-center">
                                    <div className="stat-title">Claimable Now</div>
                                    <div className="stat-value text-primary text-2xl">--</div>
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-secondary w-full text-lg shadow-md" onClick={handleClaim}>
                            Claim Unlocked Tokens
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Launchpad;
