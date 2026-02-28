"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NextPage } from "next";
import { parseEventLogs } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { ChartBarIcon, InformationCircleIcon, LockClosedIcon, RocketLaunchIcon } from "@heroicons/react/24/outline";
import deployedContracts from "~~/contracts/deployedContracts";
import { saveTokenLaunch } from "~~/utils/supabase";

// TokenFactory ABI (just the parts we need)
const TOKEN_FACTORY_ABI = deployedContracts[97].TokenFactory.abi;
const TOKEN_FACTORY_ADDRESS = deployedContracts[97].TokenFactory.address;
const CHAIN_ID = 97;

const Home: NextPage = () => {
  const router = useRouter();
  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const handleLaunch = async () => {
    if (!tokenName || !tokenSymbol || !publicClient) return;
    setIsLaunching(true);
    try {
      // 1. Send the transaction — pass an explicit gas limit so MetaMask skips
      //    eth_estimateGas (which fails on throttled BSC testnet public RPC nodes)
      const txHash = await writeContractAsync({
        address: TOKEN_FACTORY_ADDRESS,
        abi: TOKEN_FACTORY_ABI,
        functionName: "createTokenLaunch",
        args: [tokenName, tokenSymbol],
        gas: 8_000_000n, // 5 contracts deploy in sequence; 63/64 EIP-150 rule needs ~7M total
      });

      // 2. Wait for the receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // 3. Parse the TokenLaunched event from the receipt logs
      const logs = parseEventLogs({
        abi: TOKEN_FACTORY_ABI,
        logs: receipt.logs,
        eventName: "TokenLaunched",
      });

      if (logs.length > 0) {
        const event = logs[0];
        const args = event.args as {
          tokenAddress: string;
          saleAddress: string;
          vaultAddress: string;
          oracleAddress: string;
          bootstrapperAddress: string;
        };

        // 4. Save to Supabase
        await saveTokenLaunch({
          chain_id: CHAIN_ID,
          token_name: tokenName,
          token_symbol: tokenSymbol,
          token_address: args.tokenAddress,
          sale_address: args.saleAddress,
          vault_address: args.vaultAddress,
          oracle_address: args.oracleAddress ?? null,
          bootstrapper_address: args.bootstrapperAddress ?? null,
        });
      }

      setTokenName("");
      setTokenSymbol("");
      router.push("/launchpad");
    } catch (e) {
      console.error("Error launching token:", e);
      alert("Launch failed — BSC Testnet RPC may be busy. Please try again in a moment.");
    } finally {
      setIsLaunching(false);
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
            Fair launches with <strong>immediate, market-driven vesting</strong>. Stop early dumping with bonding curves
            that unlock your supply based on real market health, not arbitrary timers.
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
            disabled={!tokenName || !tokenSymbol || isLaunching}
          >
            {isLaunching ? <span className="loading loading-spinner"></span> : "Launch"}
          </button>
        </div>

        {/* Features / Explanation section */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 mb-12">
          <div className="bg-base-200 p-6 flex flex-col items-center text-center rounded-2xl gap-3 shadow-inner">
            <div className="p-3 bg-primary/10 rounded-full">
              <ChartBarIcon className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-bold text-lg m-0">Bonding Curve</h3>
            <p className="text-sm m-0 opacity-80">
              Tokens are minted and prices rise precisely as demand increases. No hidden pre-mines.
            </p>
          </div>
          <div className="bg-base-200 p-6 flex flex-col items-center text-center rounded-2xl gap-3 shadow-inner">
            <div className="p-3 bg-secondary/10 rounded-full">
              <LockClosedIcon className="w-8 h-8 text-secondary" />
            </div>
            <h3 className="font-bold text-lg m-0">Instant Vesting</h3>
            <p className="text-sm m-0 opacity-80">
              All bought tokens hit a Vesting Vault immediately. You unlock them by engaging and holding.
            </p>
          </div>
          <div className="bg-base-200 p-6 flex flex-col items-center text-center rounded-2xl gap-3 shadow-inner">
            <div className="p-3 bg-accent/10 rounded-full">
              <InformationCircleIcon className="w-8 h-8 text-accent" />
            </div>
            <h3 className="font-bold text-lg m-0">Market Health</h3>
            <p className="text-sm m-0 opacity-80">
              Unlocks accelerate when liquidity is deep and volatility is low. Dumpers get trapped.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
