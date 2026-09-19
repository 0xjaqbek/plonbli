import { db } from "@/shared/db";
import { crowdfundingMilestones } from "@/shared/db/schema";
import { eq, asc } from "drizzle-orm";

export async function getMilestones(campaignId: string) {
  return db
    .select()
    .from(crowdfundingMilestones)
    .where(eq(crowdfundingMilestones.campaignId, campaignId))
    .orderBy(asc(crowdfundingMilestones.milestoneIndex));
}
