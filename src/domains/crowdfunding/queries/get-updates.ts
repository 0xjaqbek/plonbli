import { db } from "@/shared/db";
import { crowdfundingUpdates, users } from "@/shared/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getUpdatesByCampaign(campaignId: string) {
  return db
    .select({
      id: crowdfundingUpdates.id,
      title: crowdfundingUpdates.title,
      content: crowdfundingUpdates.content,
      createdAt: crowdfundingUpdates.createdAt,
      authorName: users.name,
    })
    .from(crowdfundingUpdates)
    .innerJoin(users, eq(crowdfundingUpdates.authorId, users.id))
    .where(eq(crowdfundingUpdates.campaignId, campaignId))
    .orderBy(desc(crowdfundingUpdates.createdAt));
}
