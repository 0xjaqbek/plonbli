"use client";

import { useCallback, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { getProgram } from "../lib/program";
import { findPlatformConfigPda, findVaultPda } from "../lib/pda";

export function useFinalizeCampaignOnChain() {
  const wallet = useAnchorWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalize = useCallback(
    async (campaignAddress: string) => {
      if (!wallet) {
        setError("WALLET_NOT_CONNECTED");
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const program = getProgram(wallet);
        const campaign = new PublicKey(campaignAddress);
        const builder = program.methods.finalizeCampaign().accounts({
          campaign,
          vault: findVaultPda(campaign),
          creatorTokenAccount: program.programId,
          treasuryTokenAccount: program.programId,
          platformConfig: findPlatformConfigPda(),
          caller: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        });
        await builder.simulate();
        const signature = await builder.rpc();
        return { signature };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "FINALIZE_FAILED");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [wallet]
  );

  return { finalize, loading, error, connected: !!wallet };
}
