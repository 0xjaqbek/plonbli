"use server";

import { and, eq, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildCampaignActivatedNotification } from "@/domains/notifications/lib/notification-types";
import { db } from "@/shared/db";
import { crowdfundingCampaigns } from "@/shared/db/schema";
import {
  readCampaignOnChain,
  verifyProgramTransaction,
} from "../lib/read-campaign-onchain";

export async function finalizeCampaignAction(
  campaignId: string,
  receipt?: { signature: string }
) {
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
  if (new Date(campaign.deadline).getTime() > Date.now()) {
    return { error: "Campaign deadline has not passed" };
  }

  if (receipt) {
    try {
      await verifyProgramTransaction(receipt.signature, [
        campaign.campaignPubkey,
      ]);
    } catch {
      return { error: "Finalization transaction could not be verified" };
    }
  }

  let onChain;
  try {
    onChain = await readCampaignOnChain(campaign.campaignPubkey);
  } catch {
    return { error: "Campaign account could not be read from Solana" };
  }

  if (onChain.status === "ACTIVE") {
    return { error: "Campaign must be finalized with a wallet transaction" };
  }
  if (
    onChain.status !== "SUCCESSFUL" &&
    onChain.status !== "FAILED" &&
    onChain.status !== "FINALIZED"
  ) {
    return { error: "Unexpected on-chain campaign status" };
  }

  await db
    .update(crowdfundingCampaigns)
    .set({ status: onChain.status })
    .where(eq(crowdfundingCampaigns.id, campaignId));

  sendNotification(
    campaign.creatorId,
    buildCampaignActivatedNotification(
      `${campaign.title} â€” ${onChain.status === "FAILED" ? "Cel nie zostaĹ‚ osiÄ…gniÄ™ty" : "Sukces!"}`,
      campaignId
    )
  ).catch((error) => console.error("[finalize] notification failed:", error));

  revalidatePath(`/crowdfunding/${campaignId}`);
  return { success: true, status: onChain.status };
}

export async function finalizeExpiredCampaigns() {
  const expired = await db
    .select({ id: crowdfundingCampaigns.id })
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.status, "ACTIVE"),
        lte(crowdfundingCampaigns.deadline, new Date())
      )
    );

  const results = await Promise.all(
    expired.map((campaign) => finalizeCampaignAction(campaign.id))
  );
  return {
    total: expired.length,
    succeeded: results.filter((result) => result.success).length,
    failed: results.filter((result) => result.error).length,
  };
}
