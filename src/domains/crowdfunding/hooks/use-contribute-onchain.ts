"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import BN from "bn.js";
import { getProgram } from "../lib/program";
import { findCampaignPda, findVaultPda, findContributionPda } from "../lib/pda";

type ContributeParams = {
  campaignPubkey: string;
  amount: number;
  rewardTier: number | null;
  currencyMint: string;
};

export function useContributeOnChain() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contribute = useCallback(
    async (params: ContributeParams) => {
      if (!wallet) {
        setError("Podłącz portfel Solana");
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const program = getProgram(wallet);

        const campaignPda = new PublicKey(params.campaignPubkey);
        const vaultPda = findVaultPda(campaignPda);
        const contributionPda = findContributionPda(
          campaignPda,
          wallet.publicKey
        );
        const currencyMint = new PublicKey(params.currencyMint);

        const amount = new BN(Math.round(params.amount * 1_000_000_000));
        const rewardTier =
          params.rewardTier !== null ? params.rewardTier : null;

        // Get backer's token account for the currency
        const backerTokenAccount = await getAssociatedTokenAddress(
          currencyMint,
          wallet.publicKey
        );

        const tx = await program.methods
          .contribute(amount, rewardTier)
          .accounts({
            contribution: contributionPda,
            campaign: campaignPda,
            vault: vaultPda,
            backerTokenAccount,
            backer: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        setLoading(false);
        return {
          signature: tx,
          contributionPubkey: contributionPda.toBase58(),
        };
      } catch (err: any) {
        setError(err.message || "Błąd transakcji on-chain");
        setLoading(false);
        return null;
      }
    },
    [wallet, connection]
  );

  return { contribute, loading, error, connected: !!wallet };
}
