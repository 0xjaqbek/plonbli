"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import BN from "bn.js";
import { getProgram } from "../lib/program";
import { findCampaignPda, findVaultPda } from "../lib/pda";
import { generateContentHash } from "../lib/content-hash";

type CreateCampaignParams = {
  campaignIndex: number;
  goalAmount: number;
  deadline: Date;
  fundingModel: "ALL_OR_NOTHING" | "KEEP_WHAT_YOU_RAISE";
  currencyMint: string;
  title: string;
  description: string;
};

export function useCreateCampaignOnChain() {
  const wallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCampaign = useCallback(
    async (params: CreateCampaignParams) => {
      if (!wallet) {
        setError("WALLET_NOT_CONNECTED");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(wallet);

        const campaignId = new BN(params.campaignIndex);
        const goalAmount = new BN(
          Math.round(params.goalAmount * 1_000_000_000)
        ); // Convert to lamports
        const deadline = new BN(
          Math.floor(params.deadline.getTime() / 1000)
        );
        const fundingModel =
          params.fundingModel === "ALL_OR_NOTHING" ? 0 : 1;

        const contentHash = await generateContentHash(
          `${params.title}\n${params.description}`
        );

        const campaignPda = findCampaignPda(wallet.publicKey, campaignId);
        const vaultPda = findVaultPda(campaignPda);
        const currencyMint = new PublicKey(params.currencyMint);

        const tx = await program.methods
          .createCampaign(
            campaignId,
            goalAmount,
            deadline,
            fundingModel,
            Array.from(contentHash)
          )
          .accounts({
            campaign: campaignPda,
            vault: vaultPda,
            currencyMint,
            creator: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setLoading(false);
        return {
          signature: tx,
          campaignPubkey: campaignPda.toBase58(),
        };
      } catch (err: any) {
        setError(err.message || "TRANSACTION_FAILED");
        setLoading(false);
        return null;
      }
    },
    [wallet]
  );

  return { createCampaign, loading, error, connected: !!wallet };
}
