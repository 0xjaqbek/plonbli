import { db } from "@/shared/db";
import { crowdfundingCampaigns, users } from "@/shared/db/schema";
import { desc, eq, and, gte, or } from "drizzle-orm";

export async function getCampaigns(filters?: {
  status?: string;
  category?: string;
  creatorId?: string;
}) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(
      eq(crowdfundingCampaigns.status, filters.status as any)
    );
  }
  if (filters?.category) {
    conditions.push(
      eq(crowdfundingCampaigns.category, filters.category as any)
    );
  }
  if (filters?.creatorId) {
    conditions.push(eq(crowdfundingCampaigns.creatorId, filters.creatorId));
  }

  // Default: show ACTIVE and SUCCESSFUL campaigns
  if (!filters?.status && !filters?.creatorId) {
    conditions.push(
      or(
        eq(crowdfundingCampaigns.status, "ACTIVE"),
        eq(crowdfundingCampaigns.status, "SUCCESSFUL")
      )
    );
  }

  return db
    .select({
      id: crowdfundingCampaigns.id,
      title: crowdfundingCampaigns.title,
      description: crowdfundingCampaigns.description,
      images: crowdfundingCampaigns.images,
      category: crowdfundingCampaigns.category,
      fundingModel: crowdfundingCampaigns.fundingModel,
      goalAmount: crowdfundingCampaigns.goalAmount,
      raisedAmount: crowdfundingCampaigns.raisedAmount,
      backerCount: crowdfundingCampaigns.backerCount,
      deadline: crowdfundingCampaigns.deadline,
      status: crowdfundingCampaigns.status,
      createdAt: crowdfundingCampaigns.createdAt,
      creatorName: users.name,
      creatorAvatar: users.avatar,
    })
    .from(crowdfundingCampaigns)
    .innerJoin(users, eq(crowdfundingCampaigns.creatorId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(crowdfundingCampaigns.createdAt));
}

export async function getCampaignById(id: string) {
  const results = await db
    .select()
    .from(crowdfundingCampaigns)
    .where(eq(crowdfundingCampaigns.id, id))
    .limit(1);

  return results[0] ?? null;
}
