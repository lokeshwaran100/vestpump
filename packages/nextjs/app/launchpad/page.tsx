"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { NextPage } from "next";
import { formatEther, maxUint256, parseEther } from "viem";
import { useAccount, useBalance, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import {
  ArrowDownIcon,
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import { BondingCurveSaleAbi, Erc20Abi, MarketHealthOracleAbi, PancakeRouterAbi, VestingVaultAbi } from "~~/utils/abis";
import { notification } from "~~/utils/scaffold-eth";
import { type TokenLaunch, fetchLatestTokenLaunch, fetchTokenLaunchById } from "~~/utils/supabase";

// PancakeSwap BSC Testnet Router
const PANCAKE_ROUTER_TESTNET = "0xD99D1c33F9fC3444f8101754aBC46c52416550d1" as const;
// WBNB on BSC Testnet
const WBNB_TESTNET = "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd" as const;

type SwapMode = "buy" | "sell" | "claim";

const Launchpad: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const publicClient = usePublicClient({ chainId: 97 });
  const [mode, setMode] = useState<SwapMode>("buy");
  const [amount, setAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  const searchParams = useSearchParams();

  // 1. Fetch the token launch from Supabase:
  //    - If ?id= is in the URL, load that specific token (selected from the tokens page)
  //    - Otherwise fall back to the latest launch
  const [latestLaunch, setLatestLaunch] = useState<TokenLaunch | null>(null);
  const [launchLoading, setLaunchLoading] = useState(true);

  useEffect(() => {
    const idParam = searchParams.get("id");
    const fetcher = idParam ? fetchTokenLaunchById(Number(idParam)) : fetchLatestTokenLaunch();
    fetcher.then(data => setLatestLaunch(data)).finally(() => setLaunchLoading(false));
  }, [searchParams]);

  const tokenAddress = latestLaunch?.token_address as `0x${string}` | undefined;
  const saleAddress = latestLaunch?.sale_address as `0x${string}` | undefined;
  const vaultAddress = latestLaunch?.vault_address as `0x${string}` | undefined;
  const oracleAddress = latestLaunch?.oracle_address as `0x${string}` | undefined;

  // 2. Read sale state
  const { data: tokensSold, refetch: refetchTokensSold } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "tokensSold",
    query: { enabled: !!saleAddress },
  });

  const { data: saleEnded, refetch: refetchSaleEnded } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "saleEnded",
    query: { enabled: !!saleAddress },
  });

  // 3. Read oracle
  const { data: healthScore, refetch: refetchHealth } = useReadContract({
    address: oracleAddress,
    abi: MarketHealthOracleAbi,
    functionName: "getMarketHealthScore",
    query: { enabled: !!oracleAddress },
  });

  // 4. Read vault state for user
  const { data: unlockedAmount, refetch: refetchUnlocked } = useReadContract({
    address: vaultAddress,
    abi: VestingVaultAbi,
    functionName: "calculateUnlockedAmount",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!vaultAddress && !!connectedAddress, staleTime: 0 },
  });

  const { data: lockedAmount, refetch: refetchLocked } = useReadContract({
    address: vaultAddress,
    abi: VestingVaultAbi,
    functionName: "getLockedAmount",
    args: [connectedAddress || "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!vaultAddress && !!connectedAddress, staleTime: 0 },
  });

  // 5. Read wallet token balance
  const { data: walletBalance, refetch: refetchBalance } = useBalance({
    address: connectedAddress,
    token: tokenAddress,
    query: { enabled: !!tokenAddress && !!connectedAddress, staleTime: 0 },
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

  /** Refetch everything after a confirmed transaction */
  const refetchAll = async () => {
    await Promise.all([
      refetchTokensSold(),
      refetchSaleEnded(),
      refetchHealth(),
      refetchUnlocked(),
      refetchLocked(),
      refetchBalance(),
      refetchAllowance(),
    ]);
  };

  // Derived values
  const maxSupply = 1_000_000_000;
  const tokensSoldNum = tokensSold ? Number(formatEther(tokensSold as bigint)) : 0;
  const progressPercent = Math.min((tokensSoldNum / maxSupply) * 100, 100);
  // Only require approval once — when allowance is zero (unlimited approval is granted on first approve)
  const needsApproval = mode === "sell" && allowance !== undefined && allowance === 0n;
  const claimableNum = unlockedAmount ? Number(formatEther(unlockedAmount as bigint)) : 0;

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
    if (!tokenAddress || !spenderForSell || !publicClient) return;
    setIsApproving(true);
    try {
      // Approve unlimited so this step is only needed once
      const txHash = await writeContractAsync({
        address: tokenAddress,
        abi: Erc20Abi,
        functionName: "approve",
        args: [spenderForSell, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await refetchAllowance();
      notification.success("Approval granted! You can now sell anytime.");
    } catch (e) {
      console.error(e);
      notification.error("Approval failed");
    } finally {
      setIsApproving(false);
    }
  };

  const handleBuy = async () => {
    if (!saleAddress || !amount || !publicClient) return;
    try {
      const txHash = await writeContractAsync({
        address: saleAddress,
        abi: BondingCurveSaleAbi,
        functionName: "buyTokens",
        value: parseEther(amount),
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setAmount("");
      await refetchAll();
      notification.success("Tokens purchased!");
    } catch (e) {
      console.error(e);
      notification.error("Buy failed");
    }
  };

  const handleSellOnCurve = async () => {
    if (!saleAddress || !amount || !publicClient) return;
    try {
      const txHash = await writeContractAsync({
        address: saleAddress,
        abi: BondingCurveSaleAbi,
        functionName: "sellTokens",
        args: [parseEther(amount)],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setAmount("");
      await refetchAll();
      notification.success("Tokens sold back to curve!");
    } catch (e) {
      console.error(e);
      notification.error("Sell failed");
    }
  };

  const handleSellOnDex = async () => {
    if (!tokenAddress || !connectedAddress || !amount || !publicClient) return;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 20);
    try {
      const txHash = await writeContractAsync({
        address: PANCAKE_ROUTER_TESTNET,
        abi: PancakeRouterAbi,
        functionName: "swapExactTokensForETH",
        args: [parseEther(amount), 0n, [tokenAddress, WBNB_TESTNET], connectedAddress, deadline],
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      setAmount("");
      await refetchAll();
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
    if (!vaultAddress || !publicClient) return;
    try {
      const txHash = await writeContractAsync({
        address: vaultAddress,
        abi: VestingVaultAbi,
        functionName: "claim",
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      // Small delay so the RPC node reflects the updated vault state
      await new Promise(resolve => setTimeout(resolve, 2000));
      await refetchAll();
      notification.success("Tokens claimed to wallet!");
    } catch (e) {
      console.error(e);
      notification.error("Claim failed");
    }
  };

  if (launchLoading) {
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
        <h1 className="text-4xl font-bold mb-1">
          {latestLaunch.token_name}{" "}
          <span className="text-primary opacity-70 text-2xl font-mono">({latestLaunch.token_symbol})</span>
        </h1>
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

      {/* ── Unified Card ── */}
      <div className="w-full max-w-md">
        <div className="bg-base-100 shadow-xl rounded-3xl border border-base-300 overflow-hidden">
          {/* Three-tab header: Buy | Sell | Claim */}
          <div className="flex">
            <button
              className={`flex-1 py-4 text-base font-bold transition-colors ${
                mode === "buy" ? "bg-success text-success-content" : "bg-base-200 hover:bg-base-300 opacity-60"
              }`}
              onClick={() => {
                setMode("buy");
                setAmount("");
              }}
            >
              Buy
            </button>
            <button
              className={`flex-1 py-4 text-base font-bold transition-colors ${
                mode === "sell" ? "bg-error text-error-content" : "bg-base-200 hover:bg-base-300 opacity-60"
              }`}
              onClick={() => {
                setMode("sell");
                setAmount("");
              }}
            >
              Sell
            </button>
            <button
              className={`flex-1 py-4 text-base font-bold transition-colors ${
                mode === "claim" ? "bg-secondary text-secondary-content" : "bg-base-200 hover:bg-base-300 opacity-60"
              }`}
              onClick={() => {
                setMode("claim");
                setAmount("");
              }}
            >
              Claim
            </button>
          </div>

          <div className="p-6">
            {/* ── BUY tab ── */}
            {mode === "buy" && (
              <>
                <div className="form-control mb-2">
                  <label className="label pb-1">
                    <span className="label-text font-semibold">You pay (BNB)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.0 BNB"
                    className="input input-bordered input-lg w-full"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                {estimatedOut && (
                  <div className="flex items-center gap-2 text-sm opacity-70 mb-4 px-1">
                    <ArrowDownIcon className="w-4 h-4" />
                    <span>≈ {estimatedOut} tokens (est. at spot price)</span>
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex justify-between text-xs opacity-60 mb-1">
                    <span>Curve progress</span>
                    <span>
                      {tokensSoldNum.toLocaleString()} / {maxSupply.toLocaleString()}
                    </span>
                  </div>
                  <progress
                    className="progress progress-success w-full h-2"
                    value={progressPercent}
                    max="100"
                  ></progress>
                </div>
                <button
                  className="btn btn-success w-full text-lg"
                  onClick={handleBuy}
                  disabled={isPending || !amount || Number(amount) <= 0}
                >
                  {isPending ? <span className="loading loading-spinner"></span> : "Buy"}
                </button>
              </>
            )}

            {/* ── SELL tab ── */}
            {mode === "sell" && (
              <>
                {!saleEnded && (
                  <div className="alert alert-info text-sm mb-4 py-2">
                    <ArrowsRightLeftIcon className="w-4 h-4 flex-shrink-0" />
                    <span>Selling back to the bonding curve. You&apos;ll receive BNB at the current spot price.</span>
                  </div>
                )}
                {saleEnded && (
                  <div className="alert alert-success text-sm mb-4 py-2">
                    <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                    <span>DEX is live. Swapping via PancakeSwap Router directly on-chain.</span>
                  </div>
                )}
                <div className="form-control mb-2">
                  <label className="label pb-1">
                    <span className="label-text font-semibold">You sell (tokens)</span>
                    {walletBalance && (
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
                    placeholder="0 tokens"
                    className="input input-bordered input-lg w-full"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                </div>
                {estimatedOut && (
                  <div className="flex items-center gap-2 text-sm opacity-70 mb-4 px-1">
                    <ArrowDownIcon className="w-4 h-4" />
                    <span>≈ {estimatedOut} BNB (est. at spot price)</span>
                  </div>
                )}
                <div className="stats bg-base-200 shadow w-full mb-4">
                  <div className="stat py-2 place-items-center">
                    <div className="stat-title text-xs">In Wallet</div>
                    <div className="stat-value text-error text-xl">
                      {walletBalance ? Number(walletBalance.formatted).toLocaleString() : "0"}
                    </div>
                    <div className="stat-desc">{walletBalance?.symbol || "tokens"}</div>
                  </div>
                </div>
                {needsApproval ? (
                  <div className="flex flex-col gap-2">
                    <button className="btn btn-warning w-full text-lg" onClick={handleApprove} disabled={isApproving}>
                      {isApproving ? <span className="loading loading-spinner"></span> : "Approve (one-time)"}
                    </button>
                    <p className="text-xs text-center opacity-60">
                      One-time approval required — you won&apos;t be asked again
                    </p>
                  </div>
                ) : (
                  <button
                    className="btn btn-error w-full text-lg"
                    onClick={handleSwap}
                    disabled={isPending || !amount || Number(amount) <= 0}
                  >
                    {isPending ? <span className="loading loading-spinner"></span> : saleEnded ? "Sell on DEX" : "Sell"}
                  </button>
                )}
              </>
            )}

            {/* ── CLAIM tab ── */}
            {mode === "claim" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <LockClosedIcon className="w-5 h-5 text-secondary" />
                    <span className="font-bold text-lg">Vesting Status</span>
                  </div>
                  <div className="badge badge-accent gap-1">
                    Health: {healthScore ? (Number(healthScore) / 100).toFixed(0) : "0"}%
                  </div>
                </div>
                <p className="text-sm opacity-70 mb-4">
                  Tokens unlock based on market health. Claim to your wallet, then switch to the <strong>Sell</strong>{" "}
                  tab.
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
                    <div className="stat-value text-primary text-xl">{claimableNum.toLocaleString()}</div>
                  </div>
                  <div className="stat place-items-center py-2">
                    <div className="stat-title text-xs">In Wallet</div>
                    <div className="stat-value text-accent text-xl">
                      {walletBalance ? Number(walletBalance.formatted).toLocaleString() : "0"}
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-secondary w-full text-lg"
                  onClick={handleClaim}
                  disabled={isPending || claimableNum === 0}
                >
                  {isPending ? <span className="loading loading-spinner"></span> : "Claim Unlocked Tokens"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Vesting Summary (always visible below the card) ── */}
        <div className="mt-4 bg-base-100 rounded-2xl border border-base-300 px-5 py-4 shadow">
          <div className="flex items-center gap-2 mb-3">
            <LockClosedIcon className="w-4 h-4 text-secondary" />
            <span className="font-semibold text-sm">Vesting Overview</span>
            <div className="ml-auto badge badge-accent badge-sm">
              Health: {healthScore ? (Number(healthScore) / 100).toFixed(0) : "0"}%
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs opacity-60 mb-0.5">Locked</p>
              <p className="font-bold text-secondary text-sm">
                {lockedAmount ? Number(formatEther(lockedAmount as bigint)).toLocaleString() : "0"}
              </p>
            </div>
            <div>
              <p className="text-xs opacity-60 mb-0.5">Claimable</p>
              <p className="font-bold text-primary text-sm">{claimableNum.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs opacity-60 mb-0.5">In Wallet</p>
              <p className="font-bold text-accent text-sm">
                {walletBalance ? Number(walletBalance.formatted).toLocaleString() : "0"}
              </p>
            </div>
          </div>
          <p className="text-xs opacity-50 mt-3">
            💡 Claim tokens → switch to <strong>Sell</strong> tab → sell instantly.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Launchpad;
