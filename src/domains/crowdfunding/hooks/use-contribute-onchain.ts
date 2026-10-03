"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token";
import { getProgram } from "../lib/program";
import {
  findContributionPda,
  findRewardTierPda,
  findVaultPda,
} from "../lib/pda";
import { parseTokenAmount } from "../lib/token-amount";

type ContributeParams = {
  campaignPubkey: string;
  amount: string;
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
        setError("WALLET_NOT_CONNECTED");
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

        const mint = await getMint(connection, currencyMint);
        const amount = parseTokenAmount(params.amount, mint.decimals);
        const rewardTier =
          params.rewardTier !== null ? params.rewardTier : null;

        // Get backer's token account for the currency
        const backerTokenAccount = await getAssociatedTokenAddress(
          currencyMint,
          wallet.publicKey
        );

        const preInstructions: TransactionInstruction[] = [];
        const tokenAccountInfo = await connection.getAccountInfo(
          backerTokenAccount
        );
        if (!tokenAccountInfo) {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              backerTokenAccount,
              wallet.publicKey,
              currencyMint
            )
          );
        }

        // Native SOL is wrapped into the user's associated wSOL account inside
        // the same transaction, then the program moves it into escrow.
        if (currencyMint.equals(NATIVE_MINT)) {
          preInstructions.push(
            SystemProgram.transfer({
              fromPubkey: wallet.publicKey,
              toPubkey: backerTokenAccount,
              lamports: BigInt(amount.toString()),
            }),
            createSyncNativeInstruction(backerTokenAccount)
          );
        }

        const rewardTierAccount =
          rewardTier === null
            ? program.programId
            : findRewardTierPda(campaignPda, rewardTier);

        const builder = program.methods
          .contribute(amount, rewardTier)
          .accounts({
            contribution: contributionPda,
            campaign: campaignPda,
            rewardTierAccount,
            vault: vaultPda,
            backerTokenAccount,
            backer: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .preInstructions(preInstructions);

        await builder.simulate();
        const tx = await builder.rpc();

        setLoading(false);
        return {
          signature: tx,
          contributionPubkey: contributionPda.toBase58(),
          walletAddress: wallet.publicKey.toBase58(),
        };
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "TRANSACTION_FAILED");
        setLoading(false);
        return null;
      }
    },
    [wallet, connection]
  );

  return { contribute, loading, error, connected: !!wallet };
}
