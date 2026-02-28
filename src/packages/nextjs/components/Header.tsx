"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Tokens",
    href: "/tokens",
  },
  {
    label: "Launchpad",
    href: "/launchpad",
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();

  return (
    <>
      {menuLinks.map(({ label, href, icon }) => {
        const isActive = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              passHref
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200
                ${
                  isActive
                    ? "text-white bg-violet-600/20 border border-violet-500/40"
                    : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
            >
              {icon}
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-violet-400 rounded-full" />
              )}
            </Link>
          </li>
        );
      })}
    </>
  );
};

/**
 * Site header
 */
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div
      className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 h-16
                 bg-[#080b14]/80 backdrop-blur-xl border-b border-white/[0.06]"
    >
      {/* Left: Logo + nav */}
      <div className="flex items-center gap-6">
        {/* Mobile burger */}
        <details className="dropdown lg:hidden" ref={burgerMenuRef}>
          <summary className="btn btn-ghost btn-sm px-2">
            <Bars3Icon className="h-5 w-5 text-slate-300" />
          </summary>
          <ul
            className="menu dropdown-content mt-2 p-2 rounded-xl bg-[#0d1120] border border-white/10 shadow-xl w-48"
            onClick={() => burgerMenuRef?.current?.removeAttribute("open")}
          >
            <HeaderMenuLinks />
          </ul>
        </details>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="flex flex-col leading-none">
            <span className="font-extrabold text-white tracking-tight text-base">VestPump</span>
            <span className="text-[10px] text-violet-400 font-medium tracking-widest uppercase">Launchpad</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden lg:flex items-center gap-1">
          <HeaderMenuLinks />
        </ul>
      </div>

      {/* Right: wallet + faucet */}
      <div className="flex items-center gap-2">
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
