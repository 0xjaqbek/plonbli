import { db } from "@/shared/db";
import { crowdfundingRewardTiers } from "@/shared/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getRewardTiers(campaignId: string) {
  return db
    .select()
    .from(crowdfundingRewardTiers)
    .where(eq(crowdfundingRewardTiers.campaignId, campaignId))
    .orderBy(asc(crowdfundingRewardTiers.tierIndex));
}
