import { PublicKey } from "@solana/web3.js";

export const CROWDFUNDING_PROGRAM_ID = new PublicKey(
  "63fEfSpaubSMFFvGVo5ALKye38XACxTCwBtL1rR1beRX"
);

// Known SPL token mints
export const SOL_NATIVE_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

// Solana RPC endpoint
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ||
  "devnet";
