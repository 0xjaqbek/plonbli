"use server";

import { getMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { auth } from "@/domains/auth/lib/auth";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildContributionNotification } from "@/domains/notifications/lib/notification-types";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  crowdfundingRewardTiers,
  userWallets,
} from "@/shared/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { SOLANA_RPC_URL } from "../lib/constants";
import { formatTokenAmount } from "../lib/token-amount";
import { verifyContributionOnChain } from "../lib/verify-contribution";
import { contributeSchema } from "../schemas/validation";

export async function contributeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = contributeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const contributionPubkey = String(raw.contributionPubkey ?? "");
  const transactionSignature = String(raw.transactionSignature ?? "");
  const walletAddress = String(raw.walletAddress ?? "");
  if (!contributionPubkey || !transactionSignature || !walletAddress) {
    return { error: "Confirmed Solana contribution is required" };
  }

  const { campaignId, amount, rewardTierId } = parsed.data;
  const [campaign] = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.id, campaignId),
        eq(crowdfundingCampaigns.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!campaign?.campaignPubkey) {
    return { error: "Campaign is not active on Solana" };
  }
  if (campaign.creatorId === session.user.id) {
    return { error: "You cannot back your own campaign" };
  }
  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return { error: "Campaign deadline has passed" };
  }

  let selectedTier: typeof crowdfundingRewardTiers.$inferSelect | null = null;
  if (rewardTierId) {
    [selectedTier] = await db
      .select()
      .from(crowdfundingRewardTiers)
      .where(
        and(
          eq(crowdfundingRewardTiers.id, rewardTierId),
          eq(crowdfundingRewardTiers.campaignId, campaignId)
        )
      )
      .limit(1);

    if (!selectedTier) return { error: "Reward tier does not exist" };
    if (amount < parseFloat(selectedTier.price)) {
      return { error: `Minimum amount for this reward is ${selectedTier.price}` };
    }
  }

  let verified;
  try {
    verified = await verifyContributionOnChain({
      campaignPubkey: campaign.campaignPubkey,
      contributionPubkey,
      backerWalletAddress: walletAddress,
      transactionSignature,
    });
  } catch (error) {
    console.error("[contribute] on-chain verification failed", error);
    return { error: "The Solana contribution could not be verified" };
  }

  const expectedTierIndex = selectedTier?.tierIndex ?? null;
  if (verified.rewardTierIndex !== expectedTierIndex) {
    return { error: "On-chain reward tier does not match the selected reward" };
  }

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const mint = await getMint(connection, new PublicKey(campaign.currencyMint));
  const canonicalAmount = formatTokenAmount(verified.amount, mint.decimals);

  const [walletOwner] = await db
    .select({ userId: userWallets.userId })
    .from(userWallets)
    .where(eq(userWallets.publicKey, walletAddress))
    .limit(1);
  if (walletOwner && walletOwner.userId !== session.user.id) {
    return { error: "This wallet is already linked to another account" };
  }
  if (!walletOwner) {
    await db.insert(userWallets).values({
      userId: session.user.id,
      publicKey: walletAddress,
    });
  }

  const [existing] = await db
    .select({
      id: crowdfundingContributions.id,
      amount: crowdfundingContributions.amount,
    })
    .from(crowdfundingContributions)
    .where(eq(crowdfundingContributions.contributionPubkey, contributionPubkey))
    .limit(1);

  if (existing) {
    const delta = parseFloat(canonicalAmount) - parseFloat(existing.amount);
    if (delta < 0) return { error: "On-chain contribution amount regressed" };

    await db
      .update(crowdfundingContributions)
      .set({
        amount: canonicalAmount,
        rewardTierId: selectedTier?.id ?? null,
        walletAddress,
        transactionSignature,
        backerId: session.user.id,
      })
      .where(eq(crowdfundingContributions.id, existing.id));

    if (delta > 0) {
      await db
        .update(crowdfundingCampaigns)
        .set({
          raisedAmount: sql`(cast(${crowdfundingCampaigns.raisedAmount} as numeric) + ${delta})::text`,
        })
        .where(eq(crowdfundingCampaigns.id, campaignId));
    }
  } else {
    await db.insert(crowdfundingContributions).values({
      campaignId,
      backerId: session.user.id,
      rewardTierId: selectedTier?.id ?? null,
      amount: canonicalAmount,
      walletAddress,
      contributionPubkey,
      transactionSignature,
    });

    await db
      .update(crowdfundingCampaigns)
      .set({
        raisedAmount: sql`(cast(${crowdfundingCampaigns.raisedAmount} as numeric) + ${parseFloat(canonicalAmount)})::text`,
        backerCount: sql`${crowdfundingCampaigns.backerCount} + 1`,
      })
      .where(eq(crowdfundingCampaigns.id, campaignId));

    if (selectedTier) {
      await db
        .update(crowdfundingRewardTiers)
        .set({
          currentBackers: sql`${crowdfundingRewardTiers.currentBackers} + 1`,
        })
        .where(eq(crowdfundingRewardTiers.id, selectedTier.id));
    }
  }

  sendNotification(
    campaign.creatorId,
    buildContributionNotification(
      session.user.name ?? "Backer",
      amount.toString(),
      campaign.title,
      campaignId
    )
  ).catch((error) =>
    console.error("[contribute] notification failed:", error)
  );

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
