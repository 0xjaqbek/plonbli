"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { crowdfundingCampaigns, crowdfundingMilestones } from "@/shared/db/schema";
import {
  readMilestoneOnChain,
  verifyProgramTransaction,
  type OnChainMilestoneStatus,
} from "../lib/read-campaign-onchain";

type MilestoneReceipt = {
  signature: string;
  walletAddress: string;
};

export async function recordMilestoneStatusAction(
  milestoneId: string,
  expectedStatus: Extract<OnChainMilestoneStatus, "APPROVED" | "RELEASED">,
  receipt: MilestoneReceipt
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };
  if (!receipt?.signature || !receipt.walletAddress) {
    return { error: "Brak potwierdzenia transakcji Solana" };
  }

  const [row] = await db
    .select({
      milestone: crowdfundingMilestones,
      campaign: crowdfundingCampaigns,
    })
    .from(crowdfundingMilestones)
    .innerJoin(
      crowdfundingCampaigns,
      eq(crowdfundingCampaigns.id, crowdfundingMilestones.campaignId)
    )
    .where(eq(crowdfundingMilestones.id, milestoneId))
    .limit(1);

  if (!row?.milestone.milestonePubkey || !row.campaign.campaignPubkey) {
    return { error: "Kamień milowy nie jest zapisany na Solanie" };
  }
  if (
    expectedStatus === "RELEASED" &&
    row.campaign.creatorId !== session.user.id
  ) {
    return { error: "Tylko twórca zbiórki może wypłacić środki" };
  }
  if (
    expectedStatus === "RELEASED" &&
    receipt.walletAddress !== row.campaign.creatorWalletAddress
  ) {
    return { error: "Wypłatę musi zatwierdzić portfel twórcy zbiórki" };
  }

  try {
    await verifyProgramTransaction(receipt.signature, [
      row.campaign.campaignPubkey,
      row.milestone.milestonePubkey,
    ]);
    const onChain = await readMilestoneOnChain(
      row.milestone.milestonePubkey,
      row.campaign.campaignPubkey
    );
    if (
      onChain.status !== expectedStatus ||
      onChain.milestoneIndex !== row.milestone.milestoneIndex
    ) {
      return { error: "Stan kamienia milowego na Solanie jest inny" };
    }
  } catch {
    return { error: "Nie udało się zweryfikować transakcji na Solanie" };
  }

  await db
    .update(crowdfundingMilestones)
    .set(
      expectedStatus === "APPROVED"
        ? {
            status: "APPROVED",
            approvalTransactionSignature: receipt.signature,
          }
        : {
            status: "RELEASED",
            releaseTransactionSignature: receipt.signature,
          }
    )
    .where(
      and(
        eq(crowdfundingMilestones.id, milestoneId),
        eq(
          crowdfundingMilestones.status,
          expectedStatus === "APPROVED" ? "PENDING" : "APPROVED"
        )
      )
    );

  revalidatePath(`/crowdfunding/${row.campaign.id}`);
  return { success: true, status: expectedStatus };
}
