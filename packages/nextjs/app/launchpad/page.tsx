"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance, useReadContract, useWriteContract } from "wagmi";
import {
  ArrowsRightLeftIcon,
  ChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
  WalletIcon,
} from "@heroicons/react/24/outline";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { BondingCurveSaleAbi, MarketHealthOracleAbi, VestingVaultAbi } from "~~/utils/abis";
import { notification } from "~~/utils/scaffold-eth";

// PancakeSwap Testnet swap URL base â€” token address gets appended
const PANCAKESWAP_TESTNET_SWAP = "https://pancakeswap.finance/swap?outputCurrency=";

const Launchpad: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const [buyAmount, setBuyAmount] = useState("");

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

  // 2. Read Sale State
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

  // 3. Read Oracle State
  const { data: healthScore } = useReadContract({
    address: oracleAddress,
    abi: MarketHealthOracleAbi,
    functionName: "getMarketHealthScore",
    query: { enabled: !!oracleAddress },
  });

  // 4. Read Vault State for connected user
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

  // 5. Read ERC20 balance in wallet (claimed tokens ready to sell)
  const { data: walletBalance } = useBalance({
    address: connectedAddress,
    token: tokenAddress,
    query: { enabled: !!tokenAddress && !!connectedAddress },
  });

  // 6. Write Actions
  const { writeContractAsync: writeSale, isPending: isBuyPending } = useWriteContract();
  const { writeContractAsync: writeVault, isPending: isClaimPending } = useWriteContract();

  const maxSupply = 1_000_000_000;
  const tokensSoldFormatted = tokensSold ? Number(formatEther(tokensSold as bigint)) : 0;
  const progressPercent = Math.min((tokensSoldFormatted / maxSupply) * 100, 100);

  const handleBuy = async () => {
    if (!buyAmount || isNaN(Number(buyAmount)) || !saleAddress) return;
    try {
      await writeSale({
        address: saleAddress as `0x${string}`,
        abi: BondingCurveSaleAbi,
        functionName: "buyTokens",
        value: parseEther(buyAmount),
      });
      setBuyAmount("");
      notification.success("Buy transaction submitted!");
    } catch (e) {
      console.error("Error buying tokens:", e);
      notification.error("Failed to buy tokens");
    }
  };

  const handleClaim = async () => {
    if (!vaultAddress) return;
    try {
      await writeVault({
        address: vaultAddress as `0x${string}`,
        abi: VestingVaultAbi,
        functionName: "claim",
      });
      notification.success("Claim transaction submitted!");
    } catch (e) {
      console.error("Error claiming tokens:", e);
      notification.error("Failed to claim tokens");
    }
  };

  if (eventsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
        <p>Loading active launches...</p>
      </div>
    );
  }

  if (!latestLaunch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4">
        <h1 className="text-4xl font-bold mb-8 text-center text-error">No Active Launches Found</h1>
        <p>Please launch a token from the homepage first.</p>
      </div>
    );
  }

  const swapUrl = tokenAddress ? `${PANCAKESWAP_TESTNET_SWAP}${tokenAddress}` : "#";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-10 px-4 bg-base-200">
      <h1 className="text-4xl font-bold mb-4 text-center">Token Launch Dashboard</h1>
      <p className="opacity-70 mb-8 max-w-2xl text-center">
        Currently tracking your latest token launch. In a full production app, you would select from a list of all
        active bonding curves.
      </p>

      {/* Token address pill */}
      {tokenAddress && (
        <div className="badge badge-outline badge-lg mb-8 font-mono text-xs">
          Token: {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-7xl">
        {/* Bonding Curve Section */}
        <div className="bg-base-100 shadow-xl rounded-3xl p-6 border border-base-300">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold m-0">Bonding Curve</h2>
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
              <label className="input-group flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount in BNB"
                  className="input input-bordered w-full"
                  value={buyAmount}
                  onChange={e => setBuyAmount(e.target.value)}
                />
                <button
                  className="btn btn-primary w-full sm:w-auto mt-2 sm:mt-0"
                  onClick={handleBuy}
                  disabled={isBuyPending || !buyAmount}
                >
                  {isBuyPending ? <span className="loading loading-spinner"></span> : "Buy"}
                </button>
              </label>
              <p className="text-xs mt-2 opacity-70">Tokens are sent instantly to your Vesting Vault.</p>
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
                  <h2 className="text-xl font-bold m-0">Your Vesting</h2>
                </div>
                <div className="badge badge-accent badge-lg">
                  Health: {healthScore ? (Number(healthScore) / 100).toFixed(0) : "0"}%
                </div>
              </div>

              <p className="text-sm opacity-80 mb-4">
                Tokens unlock block-by-block based on market health. Claim them to your wallet, then sell on the DEX.
              </p>

              <div className="stats shadow bg-base-200 w-full mb-4">
                <div className="stat place-items-center py-3">
                  <div className="stat-title text-xs">Still Locked</div>
                  <div className="stat-value text-secondary text-xl">
                    {lockedAmount ? Number(formatEther(lockedAmount as bigint)).toLocaleString() : "0"}
                  </div>
                </div>
                <div className="stat place-items-center py-3">
                  <div className="stat-title text-xs">Claimable Now</div>
                  <div className="stat-value text-primary text-xl">
                    {unlockedAmount ? Number(formatEther(unlockedAmount as bigint)).toLocaleString() : "0"}
                  </div>
                </div>
              </div>
            </div>

            <button
              className="btn btn-secondary w-full text-lg shadow-md"
              onClick={handleClaim}
              disabled={isClaimPending || !unlockedAmount || (unlockedAmount as bigint) === 0n}
            >
              {isClaimPending ? <span className="loading loading-spinner"></span> : "Claim Unlocked Tokens"}
            </button>
          </div>
        </div>

        {/* Sell Section */}
        <div className="bg-base-100 shadow-xl rounded-3xl p-6 border border-base-300">
          <div className="flex flex-col h-full justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <ArrowsRightLeftIcon className="w-6 h-6 text-accent" />
                <h2 className="text-xl font-bold m-0">Sell Tokens</h2>
              </div>

              <div className="stats shadow bg-base-200 w-full mb-4">
                <div className="stat place-items-center py-3">
                  <div className="stat-title text-xs flex items-center gap-1">
                    <WalletIcon className="w-3 h-3" /> In Wallet
                  </div>
                  <div className="stat-value text-accent text-xl">
                    {walletBalance ? Number(walletBalance.formatted).toLocaleString() : "0"}
                  </div>
                  <div className="stat-desc">{walletBalance?.symbol || "Tokens"}</div>
                </div>
              </div>

              {saleEnded ? (
                <div className="alert alert-info mb-4 text-sm">
                  <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                  <span>DEX liquidity is live! You can now swap your tokens for BNB on PancakeSwap.</span>
                </div>
              ) : (
                <div className="alert alert-warning mb-4 text-sm">
                  <span>
                    ðŸ”’ DEX liquidity will be seeded once the bonding curve completes. Claim your vested tokens now and
                    sell when the curve fills.
                  </span>
                </div>
              )}
            </div>

            <a
              href={swapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn btn-accent w-full text-lg shadow-md ${!saleEnded ? "btn-disabled opacity-50" : ""}`}
              onClick={e => {
                if (!saleEnded) {
                  e.preventDefault();
                  notification.warning("DEX liquidity is not live yet. Complete the bonding curve first!");
                }
              }}
            >
              Sell on PancakeSwap â†—
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Launchpad;
