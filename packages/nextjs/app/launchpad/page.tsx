"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import {
  ArrowDownIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { BondingCurveSaleAbi, Erc20Abi, MarketHealthOracleAbi, PancakeRouterAbi, VestingVaultAbi } from "~~/utils/abis";
import { notification } from "~~/utils/scaffold-eth";

// PancakeSwap BSC Testnet Router
const PANCAKE_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550d1" as const;
// WBNB on BSC Testnet
const WBNB_TESTNET = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" as const;

type SwapMode = "buy" | "sell";

const Launchpad: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [mode, setMode] = useState<SwapMode>("buy");
  const [amount, setAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // 1. Get launched token addresses from Factory event
  const { data: events, isLoading: eventsLoading } = useScaffoldEventHistory({
    contractName: "TokenFactory",
    eventName: "TokenLaunched",
    fromBlock: 0n,
  });

  const latestLaunch = events && events.length > 0 ? events[events.length - 1] : null;
  const tokenAddress = latestLaunch?.args?.tokenAddress as `0x${string}` | undefined;
  const saleAddress = latestLaunch?.args?.saleAddress as `0x${string}` | undefined;
  const vaultAddress = latestLaunch?.args?.vaultAddress as `0x${string}` | undefined;
  const oracleAddress = latestLaunch?.args?.oracleAddress as `0x${string}` | undefined;

  // 2. Read sale state
  const { data: tokensSold } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "tokensSold",
    query: { enabled: !!saleAddress },
  });

  const { data: saleEnded } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "saleEnded",
    query: { enabled: !!saleAddress },
  });

  // 3. Read oracle
  const { data: healthScore } = useReadContract({
    address: oracleAddress,
    abi: MarketHealthOracleAbi,
    functionName: "getMarketHealthScore",
    query: { enabled: !!oracleAddress },
  });

  // 4. Read vault state for user
  const { data: unlockedAmount } = useReadContract({
    address: vaultAddress,
    abi: VestingVaultAbi,
    functionName: "calculateUnlockedAmount",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!vaultAddress && !!connectedAddress },
  });

  const { data: lockedAmount } = useReadContract({
    address: vaultAddress,
    abi: VestingVaultAbi,
    functionName: "getLockedAmount",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!vaultAddress && !!connectedAddress },
  });

  // 5. Read wallet token balance
  const { data: walletBalance, refetch: refetchBalance } = useBalance({
    address: connectedAddress,
    token: tokenAddress,
    query: { enabled: !!tokenAddress && !!connectedAddress },
  });

  // 6. Read current allowance (for sell approve flow)
  const spenderForSell = saleEnded ? PANCAKE_ROUTER_TESTNET : saleAddress;
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: Erc20Abi,
    functionName: "allowance",
    args: [
      connectedAddress || "0x0000000000000000000000000000000000000000",
      spenderForSell || "0x0000000000000000000000000000000000000000",
    ],
    query: { enabled: !!tokenAddress && !!connectedAddress && !!spenderForSell },
  });

  // 7. Write actions
  const { writeContractAsync, isPending } = useWriteContract();

  // Derived values
  const maxSupply = 1_000_000_000;
  const tokensSoldNum = tokensSold ? Number(formatEther(tokensSold as bigint)) : 0;
  const progressPercent = Math.min((tokensSoldNum / maxSupply) * 100, 100);
  const amountBigInt = amount ? parseEther(amount) : 0n;
  const needsApproval = mode === "sell" && allowance !== undefined && amountBigInt > 0n && allowance < amountBigInt;

  // Estimate output for display (simplified spot price calc)
  const INITIAL_PRICE = 0.00000001; // BNB per token
  const FINAL_PRICE = 0.0000001;
  const completionFactor = tokensSoldNum / maxSupply;
  const spotPriceBnb = INITIAL_PRICE + (FINAL_PRICE - INITIAL_PRICE) * completionFactor;
  const estimatedOut =
    mode === "buy" && amount
      ? (Number(amount) / spotPriceBnb).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : mode === "sell" && amount
        ? (Number(amount) * spotPriceBnb).toLocaleString(undefined, { maximumFractionDigits: 8 })
        : null;

  const handleApprove = async () => {
    if (!tokenAddress || !spenderForSell || !amountBigInt) return;
    setIsApproving(true);
    try {
      await writeContractAsync({
        address: tokenAddress,
        abi: Erc20Abi,
        functionName: "approve",
        args: [spenderForSell, amountBigInt],
      });
      await refetchAllowance();
      notification.success("Approval granted!");
    } catch (e) {
      console.error(e);
      notification.error("Approval failed");
    } finally {
      setIsApproving(false);
    }
  };

  const handleBuy = async () => {
    if (!saleAddress || !amount) return;
    try {
      await writeContractAsync({
        address: saleAddress,
        abi: BondingCurveSaleAbi,
        functionName: "buyTokens",
        value: parseEther(amount),
      });
      setAmount("");
      await refetchBalance();
      notification.success("Tokens purchased!");
    } catch (e) {
      console.error(e);
      notification.error("Buy failed");
    }
  };

  const handleSellOnCurve = async () => {
    if (!saleAddress || !amount) return;
    try {
      await writeContractAsync({
        address: saleAddress,
        abi: BondingCurveSaleAbi,
        functionName: "sellTokens",
        args: [parseEther(amount)],
      });
      setAmount("");
      await refetchBalance();
      notification.success("Tokens sold back to curve!");
    } catch (e) {
      console.error(e);
      notification.error("Sell failed");
    }
  };

  const handleSellOnDex = async () => {
    if (!tokenAddress || !connectedAddress || !amount) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20); // 20 min
    try {
      await writeContractAsync({
        address: PANCAKE_ROUTER_TESTNET,
        abi: PancakeRouterAbi,
        functionName: "swapExactTokensForETH",
        args: [parseEther(amount), 0n, [tokenAddress, WBNB_TESTNET], connectedAddress, deadline],
      });
      setAmount("");
      await refetchBalance();
      notification.success("Swap submitted on DEX!");
    } catch (e) {
      console.error(e);
      notification.error("DEX swap failed");
    }
  };

  const handleSwap = () => {
    if (mode === "buy") return handleBuy();
    if (!saleEnded) return handleSellOnCurve();
    return handleSellOnDex();
  };

  const handleClaim = async () => {
    if (!vaultAddress) return;
    try {
      await writeContractAsync({
        address: vaultAddress,
        abi: VestingVaultAbi,
        functionName: "claim",
      });
      await refetchBalance();
      notification.success("Tokens claimed to wallet!");
    } catch (e) {
      console.error(e);
      notification.error("Claim failed");
    }
  };

  if (eventsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="opacity-70">Loading active launches...</p>
      </div>
    );
  }

  if (!latestLaunch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4 gap-4">
        <h1 className="text-4xl font-bold text-center text-error">No Active Launches</h1>
        <p className="opacity-70">Launch a token from the homepage first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 px-4 bg-base-200 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Token Launch Dashboard</h1>
        {/* Phase badge */}
        {saleEnded ? (
          <div className="badge badge-success badge-lg gap-1 p-3">
            <CheckCircleIcon className="w-4 h-4" /> Trading Live on DEX
          </div>
        ) : (
          <div className="badge badge-primary badge-lg gap-1 p-3">
            <ChartBarIcon className="w-4 h-4" /> Bonding Curve Active — {progressPercent.toFixed(1)}% filled
          </div>
        )}
        {tokenAddress && (
          <p className="opacity-50 text-xs mt-2 font-mono">
            {tokenAddress.slice(0, 10)}...{tokenAddress.slice(-8)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* ── LEFT: Swap Card ── */}
        <div className="bg-base-100 shadow-xl rounded-3xl border border-base-300 overflow-hidden">
          {/* Buy / Sell Toggle */}
          <div className="flex">
            <button
              className={`flex-1 py-4 text-lg font-bold transition-colors ${
                mode === "buy" ? "bg-primary text-primary-content" : "bg-base-200 hover:bg-base-300 opacity-60"
              }`}
              onClick={() => {
                setMode("buy");
                setAmount("");
              }}
            >
              Buy
            </button>
            <button
              className={`flex-1 py-4 text-lg font-bold transition-colors ${
                mode === "sell" ? "bg-error text-error-content" : "bg-base-200 hover:bg-base-300 opacity-60"
              }`}
              onClick={() => {
                setMode("sell");
                setAmount("");
              }}
            >
              Sell
            </button>
          </div>

          <div className="p-6">
            {/* Phase context line */}
            {mode === "sell" && !saleEnded && (
              <div className="alert alert-info text-sm mb-4 py-2">
                <ArrowsRightLeftIcon className="w-4 h-4 flex-shrink-0" />
                <span>Selling back to the bonding curve. You'll receive BNB at the current spot price.</span>
              </div>
            )}
            {mode === "sell" && saleEnded && (
              <div className="alert alert-success text-sm mb-4 py-2">
                <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                <span>DEX is live. Swapping via PancakeSwap Router directly on-chain.</span>
              </div>
            )}

            {/* Input field */}
            <div className="form-control mb-2">
              <label className="label pb-1">
                <span className="label-text font-semibold">
                  {mode === "buy" ? "You pay (BNB)" : "You sell (tokens)"}
                </span>
                {mode === "sell" && walletBalance && (
                  <span
                    className="label-text-alt text-primary cursor-pointer underline"
                    onClick={() => setAmount(walletBalance.formatted)}
                  >
                    Max: {Number(walletBalance.formatted).toLocaleString()} {walletBalance.symbol}
                  </span>
                )}
              </label>
              <input
                type="number"
                step="any"
                placeholder={mode === "buy" ? "0.0 BNB" : "0 tokens"}
                className="input input-bordered input-lg w-full"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            {/* Estimated output */}
            {estimatedOut && (
              <div className="flex items-center gap-2 text-sm opacity-70 mb-4 px-1">
                <ArrowDownIcon className="w-4 h-4" />
                <span>
                  ≈ {estimatedOut} {mode === "buy" ? "tokens" : "BNB"} (est. at spot price)
                </span>
              </div>
            )}

            {/* Bonding curve progress (shown for context in Buy mode) */}
            {mode === "buy" && (
              <div className="mb-4">
                <div className="flex justify-between text-xs opacity-60 mb-1">
                  <span>Curve progress</span>
                  <span>
                    {tokensSoldNum.toLocaleString()} / {maxSupply.toLocaleString()}
                  </span>
                </div>
                <progress className="progress progress-primary w-full h-2" value={progressPercent} max="100"></progress>
              </div>
            )}

            {/* Wallet balance shown in sell mode */}
            {mode === "sell" && (
              <div className="stats bg-base-200 shadow w-full mb-4">
                <div className="stat py-2 place-items-center">
                  <div className="stat-title text-xs">In Wallet (claimable to sell)</div>
                  <div className="stat-value text-error text-xl">
                    {walletBalance ? Number(walletBalance.formatted).toLocaleString() : "0"}
                  </div>
                  <div className="stat-desc">{walletBalance?.symbol || "tokens"}</div>
                </div>
              </div>
            )}

            {/* Action button(s) */}
            {mode === "sell" && needsApproval ? (
              <div className="flex flex-col gap-2">
                <button
                  className="btn btn-warning w-full text-lg"
                  onClick={handleApprove}
                  disabled={isApproving || !amount}
                >
                  {isApproving ? <span className="loading loading-spinner"></span> : `Approve ${amount || "?"} tokens`}
                </button>
                <p className="text-xs text-center opacity-60">Step 1 of 2 — Approve, then Sell</p>
              </div>
            ) : (
              <button
                className={`btn w-full text-lg ${mode === "buy" ? "btn-primary" : "btn-error"}`}
                onClick={handleSwap}
                disabled={isPending || !amount || Number(amount) <= 0}
              >
                {isPending ? (
                  <span className="loading loading-spinner"></span>
                ) : mode === "buy" ? (
                  "Buy"
                ) : saleEnded ? (
                  "Sell on DEX"
                ) : (
                  "Sell"
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Vesting Card ── */}
        <div className="bg-base-100 shadow-xl rounded-3xl p-6 border border-base-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LockClosedIcon className="w-6 h-6 text-secondary" />
                <h2 className="text-xl font-bold m-0">Your Vesting</h2>
              </div>
              <div className="badge badge-accent gap-1">
                Health: {healthScore ? (Number(healthScore) / 100).toFixed(0) : "0"}%
              </div>
            </div>

            <p className="text-sm opacity-70 mb-4">
              Bought tokens are locked here and unlock based on market health. Claim them to your wallet, then sell
              using the swap card.
            </p>

            <div className="stats shadow bg-base-200 w-full mb-4">
              <div className="stat place-items-center py-2">
                <div className="stat-title text-xs">Still Locked</div>
                <div className="stat-value text-secondary text-xl">
                  {lockedAmount ? Number(formatEther(lockedAmount as bigint)).toLocaleString() : "0"}
                </div>
              </div>
              <div className="stat place-items-center py-2">
                <div className="stat-title text-xs">Claimable Now</div>
                <div className="stat-value text-primary text-xl">
                  {unlockedAmount ? Number(formatEther(unlockedAmount as bigint)).toLocaleString() : "0"}
                </div>
              </div>
              <div className="stat place-items-center py-2">
                <div className="stat-title text-xs">In Wallet</div>
                <div className="stat-value text-accent text-xl">
                  {walletBalance ? Number(walletBalance.formatted).toLocaleString() : "0"}
                </div>
              </div>
            </div>

            <p className="text-xs opacity-50 mb-4">
              💡 Tip: Claim tokens → Switch to <strong>Sell</strong> tab → Enter amount → Sell instantly.
            </p>
          </div>

          <button
            className="btn btn-secondary w-full text-lg"
            onClick={handleClaim}
            disabled={isPending || !unlockedAmount || (unlockedAmount as bigint) === 0n}
          >
            {isPending ? <span className="loading loading-spinner"></span> : "Claim Unlocked Tokens"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Launchpad;
