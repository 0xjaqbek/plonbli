import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import IDL from "./idl.json";
import { CROWDFUNDING_PROGRAM_ID, SOLANA_RPC_URL } from "./constants";

export type PlonbliCrowdfunding = typeof IDL;

export function getProgram(wallet: AnchorWallet) {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  return new Program(IDL as any, CROWDFUNDING_PROGRAM_ID, provider);
}

export function getReadonlyProgram() {
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  return { connection, programId: CROWDFUNDING_PROGRAM_ID };
}
