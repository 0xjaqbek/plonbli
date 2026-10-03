"use client";

import { useCallback, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { buildCropLogMemo } from "../lib/crop-log-anchor";

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export function useAnchorCropLog() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anchorCropLog = useCallback(
    async (input: {
      logId: string;
      contentHash: string;
      campaignPubkey?: string;
    }) => {
      if (!wallet.publicKey || !wallet.sendTransaction) {
        setError("WALLET_NOT_CONNECTED");
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const latest = await connection.getLatestBlockhash("confirmed");
        const transaction = new Transaction({
          feePayer: wallet.publicKey,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        }).add(
          new TransactionInstruction({
            programId: MEMO_PROGRAM_ID,
            keys: [
              {
                pubkey: wallet.publicKey,
                isSigner: true,
                isWritable: false,
              },
            ],
            data: Buffer.from(buildCropLogMemo(input), "utf8"),
          })
        );

        const simulation = await connection.simulateTransaction(transaction);
        if (simulation.value.err) {
          throw new Error(
            `SIMULATION_FAILED: ${JSON.stringify(simulation.value.err)}`
          );
        }

        const signature = await wallet.sendTransaction(transaction, connection);
        const confirmation = await connection.confirmTransaction(
          { signature, ...latest },
          "confirmed"
        );
        if (confirmation.value.err) {
          throw new Error("ANCHOR_TRANSACTION_FAILED");
        }

        return {
          signature,
          walletAddress: wallet.publicKey.toBase58(),
        };
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "ANCHOR_FAILED");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [connection, wallet]
  );

  return {
    anchorCropLog,
    connected: wallet.connected,
    loading,
    error,
  };
}
