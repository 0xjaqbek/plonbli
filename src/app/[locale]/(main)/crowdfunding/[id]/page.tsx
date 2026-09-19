import { notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { getMilestones } from "@/domains/crowdfunding/queries/get-milestones";
import { getRewardTiers } from "@/domains/crowdfunding/queries/get-reward-tiers";
import { CampaignDetail } from "@/domains/crowdfunding/components/campaign-detail";
import { CampaignManagement } from "@/domains/crowdfunding/components/campaign-management";

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
      <CampaignDetail
        campaign={campaign}
        milestones={milestones}
        rewardTiers={rewardTiers}
        isCreator={isCreator}
      />

      {isCreator && isSetup && (
        <div className="mt-8">
          <CampaignManagement
            campaignId={id}
            milestones={milestones}
            rewardTiers={rewardTiers}
          />
        </div>
      )}
    </div>
  );
}
