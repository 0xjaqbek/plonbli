"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { getProgram } from "../lib/program";
import { findContributionPda, findVaultPda } from "../lib/pda";

export function useClaimRefundOnChain() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimRefund = useCallback(
    async (input: {
      campaignPubkey: string;
      contributionPubkey: string;
      currencyMint: string;
    }) => {
      if (!wallet) {
        setError("WALLET_NOT_CONNECTED");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const program = getProgram(wallet);
        const campaign = new PublicKey(input.campaignPubkey);
        const contribution = new PublicKey(input.contributionPubkey);
        const expected = findContributionPda(campaign, wallet.publicKey);
        if (!contribution.equals(expected)) {
          throw new Error("CONNECTED_WALLET_DOES_NOT_OWN_CONTRIBUTION");
        }

        const mint = new PublicKey(input.currencyMint);
        const backerTokenAccount = await getAssociatedTokenAddress(
          mint,
          wallet.publicKey
        );
        const preInstructions: TransactionInstruction[] = [];
        if (!(await connection.getAccountInfo(backerTokenAccount))) {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              backerTokenAccount,
              wallet.publicKey,
              mint
            )
          );
        }

        const builder = program.methods
          .claimRefund()
          .accounts({
            contribution,
            campaign,
            vault: findVaultPda(campaign),
            backerTokenAccount,
            backer: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .preInstructions(preInstructions);
        await builder.simulate();
        const signature = await builder.rpc();
        return { signature, walletAddress: wallet.publicKey.toBase58() };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "REFUND_FAILED");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet]
  );

  return { claimRefund, loading, error };
}
