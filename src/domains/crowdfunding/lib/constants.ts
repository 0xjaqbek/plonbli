import { PublicKey } from "@solana/web3.js";

export const CROWDFUNDING_PROGRAM_ID = new PublicKey(
  "63fEfSpaubSMFFvGVo5ALKye38XACxTCwBtL1rR1beRX"
);

// Solana RPC endpoint
export const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const SOLANA_NETWORK =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as "devnet" | "mainnet-beta") ||
  "devnet";

export const PLATFORM_ADMIN_ADDRESS =
  process.env.NEXT_PUBLIC_PLATFORM_ADMIN || "";

export const WRAPPED_SOL_MINT_ADDRESS =
  "So11111111111111111111111111111111111111112";
export const DEVNET_USDC_MINT_ADDRESS =
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const MAINNET_USDC_MINT_ADDRESS =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USDC_MINT_ADDRESS =
  process.env.NEXT_PUBLIC_SOLANA_USDC_MINT ||
  (SOLANA_NETWORK === "mainnet-beta"
    ? MAINNET_USDC_MINT_ADDRESS
    : DEVNET_USDC_MINT_ADDRESS);

// This is the SPL native mint used for wrapped SOL. Contribution transactions
// wrap native SOL atomically before invoking the crowdfunding program.
export const SOL_NATIVE_MINT = new PublicKey(WRAPPED_SOL_MINT_ADDRESS);
export const USDC_MINT = new PublicKey(USDC_MINT_ADDRESS);

export const CROWDFUNDING_CURRENCIES = [
  { mint: WRAPPED_SOL_MINT_ADDRESS, label: "SOL" },
  { mint: USDC_MINT_ADDRESS, label: "USDC" },
] as const;

export function isSupportedCurrencyMint(mint: string): boolean {
  return CROWDFUNDING_CURRENCIES.some((currency) => currency.mint === mint);
}

export function getCurrencyLabel(mint?: string): string {
  if (!mint) return "";
  if (mint === WRAPPED_SOL_MINT_ADDRESS) return "SOL";
  if (
    mint === DEVNET_USDC_MINT_ADDRESS ||
    mint === MAINNET_USDC_MINT_ADDRESS ||
    mint === USDC_MINT_ADDRESS
  ) {
    return "USDC";
  }
  return mint.slice(0, 6);
}
