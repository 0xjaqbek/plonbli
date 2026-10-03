"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingMilestones,
  crowdfundingRewardTiers,
} from "@/shared/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildCampaignActivatedNotification } from "@/domains/notifications/lib/notification-types";
import { PublicKey } from "@solana/web3.js";
import { campaignIdFromDatabaseId } from "../lib/campaign-content";
import {
  readCampaignOnChain,
  readMilestoneOnChain,
  readRewardTierOnChain,
  verifyProgramTransaction,
} from "../lib/read-campaign-onchain";
import {
  findCampaignPda,
  findMilestonePda,
  findRewardTierPda,
} from "../lib/pda";

export type CampaignActivationReceipt = {
  campaignPubkey: string;
  creatorWalletAddress: string;
  createSignature: string | null;
  activationSignature: string | null;
  milestoneReceipts: Array<{
    index: number;
    pubkey: string;
    signature: string | null;
  }>;
  rewardTierReceipts: Array<{
    index: number;
    pubkey: string;
    signature: string | null;
  }>;
};

export async function activateCampaignAction(
  campaignId: string,
  receipt?: CampaignActivationReceipt
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  // Verify ownership and SETUP status
  const [campaign] = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.id, campaignId),
        eq(crowdfundingCampaigns.creatorId, session.user.id),
        eq(crowdfundingCampaigns.status, "SETUP")
      )
    )
    .limit(1);

  if (!campaign) {
    return { error: "Nie znaleziono zbiórki lub brak uprawnień" };
  }

  // Require at least 1 milestone
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(crowdfundingMilestones)
    .where(eq(crowdfundingMilestones.campaignId, campaignId));

  if (count === 0) {
    return { error: "Dodaj co najmniej jeden kamień milowy przed aktywacją" };
  }

  // Server-side deadline check (don't trust client)
  if (new Date(campaign.deadline).getTime() <= Date.now()) {
    return { error: "Termin zakończenia musi być w przyszłości" };
  }

  // Validate milestone targets don't exceed goal
  const [{ total }] = await db
    .select({
      total: sql<string>`coalesce(sum(cast(${crowdfundingMilestones.targetAmount} as numeric)), 0)::text`,
    })
    .from(crowdfundingMilestones)
    .where(eq(crowdfundingMilestones.campaignId, campaignId));

  if (parseFloat(total) > parseFloat(campaign.goalAmount)) {
    return { error: "Suma celów kamieni milowych przekracza cel zbiórki" };
  }

  if (!receipt) {
    return { error: "Missing confirmed Solana activation receipt" };
  }

  if (receipt.milestoneReceipts.length !== count) {
    return { error: "Not all milestones were created on Solana" };
  }

  const [{ count: rewardTierCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(crowdfundingRewardTiers)
    .where(eq(crowdfundingRewardTiers.campaignId, campaignId));

  if (receipt.rewardTierReceipts.length !== rewardTierCount) {
    return { error: "Not all reward tiers were created on Solana" };
  }

  try {
    const creator = new PublicKey(receipt.creatorWalletAddress);
    const expectedCampaign = findCampaignPda(
      creator,
      await campaignIdFromDatabaseId(campaignId)
    );
    if (receipt.campaignPubkey !== expectedCampaign.toBase58()) {
      throw new Error("CAMPAIGN_PDA_MISMATCH");
    }

    const milestoneIndexes = receipt.milestoneReceipts
      .map((item) => item.index)
      .sort((left, right) => left - right);
    const rewardIndexes = receipt.rewardTierReceipts
      .map((item) => item.index)
      .sort((left, right) => left - right);
    if (
      milestoneIndexes.some((index, position) => index !== position) ||
      rewardIndexes.some((index, position) => index !== position)
    ) {
      throw new Error("NON_SEQUENTIAL_ON_CHAIN_INDEXES");
    }

    await Promise.all([
      ...(receipt.createSignature
        ? [
            verifyProgramTransaction(receipt.createSignature, [
              receipt.campaignPubkey,
              receipt.creatorWalletAddress,
            ]),
          ]
        : []),
      ...(receipt.activationSignature
        ? [
            verifyProgramTransaction(receipt.activationSignature, [
              receipt.campaignPubkey,
              receipt.creatorWalletAddress,
            ]),
          ]
        : []),
      ...receipt.milestoneReceipts.map(async (item) => {
        const expected = findMilestonePda(expectedCampaign, item.index);
        if (item.pubkey !== expected.toBase58()) {
          throw new Error("MILESTONE_PDA_MISMATCH");
        }
        if (item.signature) {
          await verifyProgramTransaction(item.signature, [
            receipt.campaignPubkey,
            item.pubkey,
          ]);
        }
        const onChain = await readMilestoneOnChain(
          item.pubkey,
          receipt.campaignPubkey
        );
        if (onChain.milestoneIndex !== item.index) {
          throw new Error("MILESTONE_INDEX_MISMATCH");
        }
      }),
      ...receipt.rewardTierReceipts.map(async (item) => {
        const expected = findRewardTierPda(expectedCampaign, item.index);
        if (item.pubkey !== expected.toBase58()) {
          throw new Error("REWARD_TIER_PDA_MISMATCH");
        }
        if (item.signature) {
          await verifyProgramTransaction(item.signature, [
            receipt.campaignPubkey,
            item.pubkey,
          ]);
        }
        const onChain = await readRewardTierOnChain(
          item.pubkey,
          receipt.campaignPubkey
        );
        if (onChain.tierIndex !== item.index) {
          throw new Error("REWARD_TIER_INDEX_MISMATCH");
        }
      }),
    ]);

    const onChainCampaign = await readCampaignOnChain(receipt.campaignPubkey);
    if (
      onChainCampaign.status !== "ACTIVE" ||
      onChainCampaign.creator !== receipt.creatorWalletAddress ||
      onChainCampaign.currencyMint !== campaign.currencyMint ||
      onChainCampaign.contentHash !== campaign.contentHash ||
      onChainCampaign.deadline !==
        Math.floor(new Date(campaign.deadline).getTime() / 1000).toString()
    ) {
      throw new Error("CAMPAIGN_ACCOUNT_MISMATCH");
    }
  } catch (error) {
    console.error("[activate] on-chain verification failed", error);
    return { error: "Campaign activation could not be verified on Solana" };
  }

  await db
    .update(crowdfundingCampaigns)
    .set({
      status: "ACTIVE",
      campaignPubkey: receipt.campaignPubkey,
      creatorWalletAddress: receipt.creatorWalletAddress,
      createTransactionSignature: receipt.createSignature,
      activationTransactionSignature: receipt.activationSignature,
    })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  await Promise.all(
    receipt.milestoneReceipts.map((item) =>
      db
        .update(crowdfundingMilestones)
        .set({
          milestonePubkey: item.pubkey,
          createTransactionSignature: item.signature,
        })
        .where(
          and(
            eq(crowdfundingMilestones.campaignId, campaignId),
            eq(crowdfundingMilestones.milestoneIndex, item.index)
          )
        )
    )
  );

  await Promise.all(
    receipt.rewardTierReceipts.map((item) =>
      db
        .update(crowdfundingRewardTiers)
        .set({
          rewardTierPubkey: item.pubkey,
          createTransactionSignature: item.signature,
        })
        .where(
          and(
            eq(crowdfundingRewardTiers.campaignId, campaignId),
            eq(crowdfundingRewardTiers.tierIndex, item.index)
          )
        )
    )
  );

  // Notify creator that campaign is live
  sendNotification(
    session.user.id,
    buildCampaignActivatedNotification(campaign.title, campaignId)
  ).catch((err) => console.error("[activate] notification failed:", err));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true };
}
