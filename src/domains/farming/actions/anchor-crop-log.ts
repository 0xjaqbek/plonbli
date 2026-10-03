"use server";

import { Connection, PublicKey } from "@solana/web3.js";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/domains/auth/lib/auth";
import { SOLANA_RPC_URL } from "@/domains/crowdfunding/lib/constants";
import { db } from "@/shared/db";
import {
  cropLogs,
  crowdfundingCampaigns,
  userWallets,
} from "@/shared/db/schema";
import { buildCropLogMemo } from "../lib/crop-log-anchor";

export async function anchorCropLogAction(input: {
  logId: string;
  walletAddress: string;
  transactionSignature: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const [entry] = await db
    .select({
      id: cropLogs.id,
      farmerId: cropLogs.farmerId,
      contentHash: cropLogs.contentHash,
      campaignId: cropLogs.campaignId,
      existingSignature: cropLogs.anchorTransactionSignature,
    })
    .from(cropLogs)
    .where(
      and(
        eq(cropLogs.id, input.logId),
        eq(cropLogs.farmerId, session.user.id)
      )
    )
    .limit(1);

  if (!entry) return { error: "Crop log entry was not found" };
  if (entry.existingSignature) return { error: "Entry is already anchored" };

  let campaignPubkey: string | undefined;
  if (entry.campaignId) {
    const [campaign] = await db
      .select({ campaignPubkey: crowdfundingCampaigns.campaignPubkey })
      .from(crowdfundingCampaigns)
      .where(eq(crowdfundingCampaigns.id, entry.campaignId))
      .limit(1);
    campaignPubkey = campaign?.campaignPubkey ?? undefined;
  }

  const expectedMemo = buildCropLogMemo({
    logId: entry.id,
    contentHash: entry.contentHash,
    campaignPubkey,
  });

  const wallet = new PublicKey(input.walletAddress);
  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const transaction = await connection.getTransaction(
    input.transactionSignature,
    { commitment: "confirmed", maxSupportedTransactionVersion: 0 }
  );

  if (!transaction || transaction.meta?.err) {
    return { error: "Anchor transaction is not confirmed" };
  }

  const message = transaction.transaction.message as unknown as {
    header: { numRequiredSignatures: number };
    staticAccountKeys?: PublicKey[];
    accountKeys?: PublicKey[];
  };
  const accountKeys = message.staticAccountKeys ?? message.accountKeys ?? [];
  const signerKeys = accountKeys.slice(0, message.header.numRequiredSignatures);
  if (!signerKeys.some((key) => key.equals(wallet))) {
    return { error: "Connected wallet did not sign the anchor transaction" };
  }

  const memoMatches = transaction.meta?.logMessages?.some((line) =>
    line.includes(expectedMemo)
  );
  if (!memoMatches) return { error: "Anchor memo does not match this entry" };

  const [walletOwner] = await db
    .select({ userId: userWallets.userId })
    .from(userWallets)
    .where(eq(userWallets.publicKey, input.walletAddress))
    .limit(1);
  if (walletOwner && walletOwner.userId !== session.user.id) {
    return { error: "This wallet is already linked to another account" };
  }
  if (!walletOwner) {
    await db.insert(userWallets).values({
      userId: session.user.id,
      publicKey: input.walletAddress,
    });
  }

  await db
    .update(cropLogs)
    .set({
      farmerWalletAddress: input.walletAddress,
      anchorTransactionSignature: input.transactionSignature,
      anchoredAt: new Date(),
    })
    .where(eq(cropLogs.id, entry.id));

  revalidatePath(`/farmers/${session.user.id}/crop-log`);
  if (entry.campaignId) revalidatePath(`/crowdfunding/${entry.campaignId}`);
  return { success: true };
}
