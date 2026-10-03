"use client";

import { useCallback, useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { getProgram } from "../lib/program";
import {
  findMilestonePda,
  findPlatformConfigPda,
  findVaultPda,
} from "../lib/pda";

export function useMilestoneOnChain() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    if (!wallet) {
      setIsPlatformAdmin(false);
      return;
    }
    const program = getProgram(wallet);
    program.account.platformConfig
      .fetch(findPlatformConfigPda())
      .then((value) => {
        const config = value as { admin: PublicKey };
        if (active) setIsPlatformAdmin(config.admin.equals(wallet.publicKey));
      })
      .catch(() => {
        if (active) setIsPlatformAdmin(false);
      });
    return () => {
      active = false;
    };
  }, [wallet]);

  const approve = useCallback(
    async (input: { campaignPubkey: string; milestonePubkey: string }) => {
      if (!wallet) {
        setError("WALLET_NOT_CONNECTED");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const program = getProgram(wallet);
        const platformConfig = findPlatformConfigPda();
        const config = (await program.account.platformConfig.fetch(
          platformConfig
        )) as { admin: PublicKey };
        if (!config.admin.equals(wallet.publicKey)) {
          throw new Error("ONLY_PLATFORM_ADMIN_CAN_APPROVE_MILESTONES");
        }
        const builder = program.methods.approveMilestone().accounts({
          milestone: new PublicKey(input.milestonePubkey),
          campaign: new PublicKey(input.campaignPubkey),
          platformConfig,
          admin: wallet.publicKey,
        });
        await builder.simulate();
        const signature = await builder.rpc();
        return { signature, walletAddress: wallet.publicKey.toBase58() };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "APPROVAL_FAILED");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [wallet]
  );

  const release = useCallback(
    async (input: {
      campaignPubkey: string;
      milestonePubkey: string;
      milestoneIndex: number;
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
        const mint = new PublicKey(input.currencyMint);
        const platformConfig = findPlatformConfigPda();
        const config = (await program.account.platformConfig.fetch(
          platformConfig
        )) as { treasury: PublicKey };
        const campaignAccount = (await program.account.campaign.fetch(
          campaign
        )) as { creator: PublicKey };
        if (!campaignAccount.creator.equals(wallet.publicKey)) {
          throw new Error("ONLY_CAMPAIGN_CREATOR_CAN_RELEASE_FUNDS");
        }

        const creatorTokenAccount = await getAssociatedTokenAddress(
          mint,
          wallet.publicKey
        );
        const treasuryTokenAccount = await getAssociatedTokenAddress(
          mint,
          config.treasury
        );
        const preInstructions: TransactionInstruction[] = [];
        if (!(await connection.getAccountInfo(creatorTokenAccount))) {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              creatorTokenAccount,
              wallet.publicKey,
              mint
            )
          );
        }
        if (!(await connection.getAccountInfo(treasuryTokenAccount))) {
          preInstructions.push(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              treasuryTokenAccount,
              config.treasury,
              mint
            )
          );
        }

        const builder = program.methods
          .releaseMilestoneFunds()
          .accounts({
            milestone: new PublicKey(input.milestonePubkey),
            campaign,
            vault: findVaultPda(campaign),
            creatorTokenAccount,
            treasuryTokenAccount,
            platformConfig,
            creator: wallet.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .remainingAccounts(
            input.milestoneIndex === 0
              ? []
              : [
                  {
                    pubkey: findMilestonePda(
                      campaign,
                      input.milestoneIndex - 1
                    ),
                    isSigner: false,
                    isWritable: false,
                  },
                ]
          )
          .preInstructions(preInstructions);
        await builder.simulate();
        const signature = await builder.rpc();
        return { signature, walletAddress: wallet.publicKey.toBase58() };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "RELEASE_FAILED");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet]
  );

  return {
    approve,
    release,
    loading,
    error,
    connected: !!wallet,
    isPlatformAdmin,
  };
}
