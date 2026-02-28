"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { formatEther } from "viem";
import { useReadContract } from "wagmi";
import {
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  CheckCircleIcon,
  LockClosedIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import { BondingCurveSaleAbi } from "~~/utils/abis";
import { type TokenLaunch, fetchTokenLaunches } from "~~/utils/supabase";

// ── Individual token card — reads live on-chain stats for its sale contract ──
function TokenCard({ launch, index }: { launch: TokenLaunch; index: number }) {
  const saleAddress = launch.sale_address as `0x${string}`;
  const vaultAddress = launch.vault_address as `0x${string}`;
  const tokenAddress = launch.token_address as `0x${string}`;

  const { data: tokensSold } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "tokensSold",
  });

  const { data: bnbRaised } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "bnbRaised",
  });

  const { data: saleEnded } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "saleEnded",
  });

  const { data: uniqueBuyers } = useReadContract({
    address: saleAddress,
    abi: BondingCurveSaleAbi,
    functionName: "uniqueBuyersCount",
  });

  const MAX_SUPPLY = 1_000_000_000;
  const soldNum = tokensSold ? Number(formatEther(tokensSold as bigint)) : 0;
  const progress = Math.min((soldNum / MAX_SUPPLY) * 100, 100);
  const bnbNum = bnbRaised ? Number(formatEther(bnbRaised as bigint)) : 0;

  const gradients = [
    "from-violet-500/20 to-indigo-500/10",
    "from-emerald-500/20 to-teal-500/10",
    "from-rose-500/20 to-pink-500/10",
    "from-amber-500/20 to-orange-500/10",
    "from-sky-500/20 to-cyan-500/10",
    "from-fuchsia-500/20 to-purple-500/10",
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl shadow-lg overflow-hidden flex flex-col">
      {/* Coloured top strip */}
      <div className={`bg-gradient-to-r ${gradient} h-2`} />

      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient}`}>
              <RocketLaunchIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-base leading-tight">
                {launch.token_name}{" "}
                <span className="text-xs font-mono text-primary opacity-70">({launch.token_symbol})</span>
              </p>
              <p className="text-xs font-mono opacity-50">
                {tokenAddress.slice(0, 8)}…{tokenAddress.slice(-6)}
              </p>
            </div>
          </div>
          {saleEnded ? (
            <span className="badge badge-success badge-sm gap-1">
              <CheckCircleIcon className="w-3 h-3" /> DEX Live
            </span>
          ) : (
            <span className="badge badge-primary badge-sm gap-1">
              <ChartBarIcon className="w-3 h-3" /> Bonding Curve
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs opacity-60 mb-1">
            <span>Curve progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <progress className="progress progress-primary w-full h-2" value={progress} max="100" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-base-200 rounded-xl py-2 px-1">
            <p className="text-xs opacity-60">Tokens Sold</p>
            <p className="font-bold text-sm text-primary">
              {soldNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-base-200 rounded-xl py-2 px-1">
            <p className="text-xs opacity-60">BNB Raised</p>
            <p className="font-bold text-sm text-secondary">
              {bnbNum.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </p>
          </div>
          <div className="bg-base-200 rounded-xl py-2 px-1">
            <p className="text-xs opacity-60">Buyers</p>
            <p className="font-bold text-sm text-accent">{uniqueBuyers ? Number(uniqueBuyers).toString() : "0"}</p>
          </div>
        </div>

        {/* Contract addresses */}
        <div className="flex flex-col gap-1 mt-1">
          <div className="flex items-center gap-1 text-xs opacity-50">
            <LockClosedIcon className="w-3 h-3" />
            <span className="font-mono">
              Vault: {vaultAddress.slice(0, 10)}…{vaultAddress.slice(-6)}
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-auto pt-3">
          <Link href="/launchpad" className="btn btn-primary btn-sm w-full gap-1">
            Open Launchpad
            <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
const TokensPage: NextPage = () => {
  const [launches, setLaunches] = useState<TokenLaunch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTokenLaunches()
      .then(data => setLaunches(data))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="opacity-70">Loading launched tokens…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-10 px-4 bg-base-200 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8 max-w-xl">
        <h1 className="text-4xl font-bold mb-2">All Launched Tokens</h1>
        <p className="opacity-70 text-sm">
          Every token launched through VestPump&apos;s bonding curve. Click a token&apos;s card to trade on the
          launchpad.
        </p>
      </div>

      {/* Stats bar */}
      {launches.length > 0 && (
        <div className="stats shadow bg-base-100 border border-base-300 mb-8">
          <div className="stat place-items-center py-3">
            <div className="stat-title text-xs">Total Launches</div>
            <div className="stat-value text-primary text-2xl">{launches.length}</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {launches.length === 0 && (
        <div className="flex flex-col items-center gap-4 mt-20">
          <RocketLaunchIcon className="w-16 h-16 opacity-30" />
          <h2 className="text-2xl font-bold opacity-60">No tokens launched yet</h2>
          <p className="opacity-50 text-sm">Be the first to launch a token on the bonding curve.</p>
          <Link href="/" className="btn btn-primary mt-2">
            Launch a Token
          </Link>
        </div>
      )}

      {/* Token grid */}
      {launches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          {launches.map((launch, i) => (
            <TokenCard key={launch.id} launch={launch} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TokensPage;
