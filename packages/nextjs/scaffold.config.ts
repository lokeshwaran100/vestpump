import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  onlyLocalBurnerWallet: boolean;
};

export type ScaffoldConfig = BaseConfig;

export const DEFAULT_ALCHEMY_API_KEY = "cR4WnXePioePZ5fFrnSiR";

const scaffoldConfig = {
  // BNB Testnet (chain 97)
  targetNetworks: [chains.bscTestnet],

  // Polling interval in ms — 4s is fine for BSC testnet
  pollingInterval: 4000,

  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,

  // Use Binance's public RPC for BSC testnet (more reliable than the generic http() fallback)
  rpcOverrides: {
    [chains.bscTestnet.id]: "https://data-seed-prebsc-1-s1.binance.org:8545",
  },

  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",

  // Allow all wallet types on testnet (not just burner wallets)
  onlyLocalBurnerWallet: false,
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
