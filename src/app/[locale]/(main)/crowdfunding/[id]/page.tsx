import { notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCampaignById, getCampaigns } from "@/domains/crowdfunding/queries/get-campaigns";
import { getMilestones } from "@/domains/crowdfunding/queries/get-milestones";
import { getRewardTiers } from "@/domains/crowdfunding/queries/get-reward-tiers";
import { CampaignDetail } from "@/domains/crowdfunding/components/campaign-detail";
import { CampaignManagement } from "@/domains/crowdfunding/components/campaign-management";
import { WalletButton } from "@/domains/crowdfunding/components/wallet-button";

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
  // Count all campaigns by this creator to derive a unique on-chain index
  const creatorCampaigns = await getCampaigns({ creatorId, limit: 1000 });
  const campaignIndex = creatorCampaigns.length;

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

  const [milestones, rewardTiers] = await Promise.all([
    getMilestones(id),
    getRewardTiers(id),
  ]);

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
      />

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
