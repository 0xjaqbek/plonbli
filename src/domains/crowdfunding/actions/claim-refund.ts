"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  crowdfundingCampaigns,
  crowdfundingContributions,
  crowdfundingRewardTiers,
} from "@/shared/db/schema";
import { verifyProgramTransaction } from "../lib/read-campaign-onchain";
import { readContributionOnChain } from "../lib/verify-contribution";

export type RefundReceipt = {
  signature: string;
  walletAddress: string;
};

/** Reconciles the database only after Solana has returned the escrowed tokens. */
export async function claimRefundAction(
  contributionId: string,
  receipt: RefundReceipt
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const [contribution] = await db
    .select()
    .from(crowdfundingContributions)
    .where(
      and(
        eq(crowdfundingContributions.id, contributionId),
        eq(crowdfundingContributions.backerId, session.user.id)
      )
    )
    .limit(1);

  if (!contribution) return { error: "Wpłata nie została znaleziona" };
  if (contribution.refunded) return { error: "Zwrot został już zrealizowany" };
  if (
    !receipt?.signature ||
    !receipt.walletAddress ||
    receipt.walletAddress !== contribution.walletAddress
  ) {
    return { error: "Zwrot musi zatwierdzić portfel użyty do wpłaty" };
  }
  if (!contribution.contributionPubkey) {
    return { error: "Wpłata nie ma powiązanego konta Solana" };
  }

  const [campaign] = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(
      and(
        eq(crowdfundingCampaigns.id, contribution.campaignId),
        eq(crowdfundingCampaigns.status, "FAILED")
      )
    )
    .limit(1);

  if (!campaign?.campaignPubkey) {
    return { error: "Zwroty są dostępne tylko dla nieudanych zbiórek Solana" };
  }

  try {
    await verifyProgramTransaction(receipt.signature, [
      campaign.campaignPubkey,
      contribution.contributionPubkey,
    ]);
    const onChain = await readContributionOnChain({
      campaignPubkey: campaign.campaignPubkey,
      contributionPubkey: contribution.contributionPubkey,
      backerWalletAddress: receipt.walletAddress,
    });
    if (!onChain.refunded) {
      return { error: "Zwrot nie został jeszcze potwierdzony na Solanie" };
    }
  } catch {
    return { error: "Nie udało się zweryfikować zwrotu na Solanie" };
  }

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(crowdfundingContributions)
      .set({
        refunded: true,
        refundTransactionSignature: receipt.signature,
      })
      .where(
        and(
          eq(crowdfundingContributions.id, contributionId),
          eq(crowdfundingContributions.refunded, false)
        )
      )
      .returning({ id: crowdfundingContributions.id });

    if (updated.length > 0 && contribution.rewardTierId) {
      await tx
        .update(crowdfundingRewardTiers)
        .set({
          currentBackers: sql`greatest(${crowdfundingRewardTiers.currentBackers} - 1, 0)`,
        })
        .where(eq(crowdfundingRewardTiers.id, contribution.rewardTierId));
    }
  });

  revalidatePath(`/crowdfunding/${contribution.campaignId}`);
  revalidatePath("/crowdfunding/backed");
  return { success: true, amount: contribution.amount };
}
