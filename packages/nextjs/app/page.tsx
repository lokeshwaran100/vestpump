"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import { InformationCircleIcon, RocketLaunchIcon, LockClosedIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Address } from "@scaffold-ui/components";

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();

  // State for token creation form
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");

  const { writeContractAsync: writeTokenFactory } = useScaffoldWriteContract("TokenFactory");

  const handleLaunch = async () => {
    if (!tokenName || !tokenSymbol) return;
    try {
      await writeTokenFactory({
        functionName: "createTokenLaunch",
        args: [tokenName, tokenSymbol],
      });
      setTokenName("");
      setTokenSymbol("");
      // Realistically we'd want to index these launches, but for MVP we rely on the deployer's address or events
    } catch (e) {
      console.error("Error launching token:", e);
    }
  };

  return (
    <>
      <div className="flex items-center flex-col grow pt-10 px-5 gap-10">
        <div className="text-center max-w-2xl px-5">
          <h1 className="text-center font-bold">
            <span className="block text-4xl mb-2 text-primary">VestPump 🚀</span>
            <span className="block text-xl opacity-80">Market-Driven Token Launches</span>
          </h1>
          <p className="mt-4 text-lg">
            Fair launches with <strong>immediate, market-driven vesting</strong>. Stop early dumping with bonding curves that unlock your supply based on real market health, not arbitrary timers.
          </p>
        </div>

        {/* Token Creation Dashboard */}
        <div className="w-full max-w-3xl bg-base-100 shadow-2xl rounded-3xl p-8 border border-base-300">
          <div className="flex items-center gap-3 mb-6">
            <RocketLaunchIcon className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold m-0">Launch a new Token</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm ml-1">Token Name</label>
              <input
                type="text"
                placeholder="e.g. PumpCoin"
                className="input input-bordered input-primary w-full shadow-inner"
                value={tokenName}
                onChange={e => setTokenName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm ml-1">Token Symbol</label>
              <input
                type="text"
                placeholder="e.g. PUMP"
                className="input input-bordered input-primary w-full shadow-inner"
                value={tokenSymbol}
                onChange={e => setTokenSymbol(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn btn-primary w-full mt-8 shadow-md text-lg"
            onClick={handleLaunch}
            disabled={!tokenName || !tokenSymbol}
          >
            Launch on Bonding Curve
          </button>
        </div>

        {/* Features / Explanation section */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-12">
          <div className="bg-base-200 p-6 flex flex-col items-center text-center rounded-2xl gap-3 shadow-inner">
            <div className="p-3 bg-primary/10 rounded-full">
              <ChartBarIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg m-0">Bonding Curve</h3>
            <p className="text-sm m-0 opacity-80">Tokens are minted and prices rise precisely as demand increases. No hidden pre-mines.</p>
          </div>
          <div className="bg-base-200 p-6 flex flex-col items-center text-center rounded-2xl gap-3 shadow-inner">
            <div className="p-3 bg-secondary/10 rounded-full">
              <LockClosedIcon className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="font-bold text-lg m-0">Instant Vesting</h3>
            <p className="text-sm m-0 opacity-80">All bought tokens hit a Vesting Vault immediately. You unlock them by engaging and holding.</p>
          </div>
          <div className="bg-base-200 p-6 flex flex-col items-center text-center rounded-2xl gap-3 shadow-inner">
            <div className="p-3 bg-accent/10 rounded-full">
              <InformationCircleIcon className="w-8 h-8 text-accent" />
            </div>
            <h3 className="font-bold text-lg m-0">Market Health</h3>
            <p className="text-sm m-0 opacity-80">Unlocks accelerate when liquidity is deep and volatility is low. Dumpers get trapped.</p>
          </div>
        </div>

      </div>
    </>
  );
};

export default Home;
