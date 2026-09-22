import { notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { getMilestones } from "@/domains/crowdfunding/queries/get-milestones";
import { getRewardTiers } from "@/domains/crowdfunding/queries/get-reward-tiers";
import { getContributionsByCampaign } from "@/domains/crowdfunding/queries/get-contributions";
import { getUpdatesByCampaign } from "@/domains/crowdfunding/queries/get-updates";
import { CampaignDetail } from "@/domains/crowdfunding/components/campaign-detail";
import { CampaignManagement } from "@/domains/crowdfunding/components/campaign-management";
import { CampaignUpdates } from "@/domains/crowdfunding/components/campaign-updates";
import { WalletButton } from "@/domains/crowdfunding/components/wallet-button";
import { db } from "@/shared/db";
import { users, crowdfundingCampaigns } from "@/shared/db/schema";
import { eq, sql } from "drizzle-orm";

async function CampaignManagementWrapper({
  campaign,
  milestones,
  rewardTiers,
  creatorId,
}: {
  campaign: any;
  milestones: any;
  rewardTiers: any;
  creatorId: string;
}) {
  const countResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(crowdfundingCampaigns)
    .where(eq(crowdfundingCampaigns.creatorId, creatorId));
  const campaignIndex = countResult[0]?.count ?? 0;

  return (
    <div className="mt-8">
      <CampaignManagement
        campaign={campaign}
        milestones={milestones}
        rewardTiers={rewardTiers}
        campaignIndex={campaignIndex}
      />
    </div>
  );
}

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const campaign = await getCampaignById(id);
  if (!campaign) {
    notFound();
  }

  const isCreator = session?.user?.id === campaign.creatorId;
  const isSetup = campaign.status === "SETUP";

  const [milestones, rewardTiers, contributions, creatorResult, updates] =
    await Promise.all([
      getMilestones(id),
      getRewardTiers(id),
      getContributionsByCampaign(id),
      db
        .select({ name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, campaign.creatorId))
        .limit(1),
      getUpdatesByCampaign(id),
    ]);

  const creatorName = creatorResult[0]?.name ?? "";
  const creatorAvatar = creatorResult[0]?.avatar ?? null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="flex justify-end mb-4">
        <WalletButton />
      </div>

      <CampaignDetail
        campaign={campaign}
        milestones={milestones}
        rewardTiers={rewardTiers}
        isCreator={isCreator}
        creatorName={creatorName}
        creatorAvatar={creatorAvatar}
        contributions={contributions}
      />

      <div className="mt-8">
        <CampaignUpdates
          campaignId={id}
          updates={updates}
          isCreator={isCreator}
        />
      </div>

      {isCreator && isSetup && (
        <CampaignManagementWrapper
          campaign={campaign}
          milestones={milestones}
          rewardTiers={rewardTiers}
          creatorId={campaign.creatorId}
        />
      )}
    </div>
  );
}
