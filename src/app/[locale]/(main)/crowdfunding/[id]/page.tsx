import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import { getCropLogsByCampaign } from "@/domains/farming/queries/get-crop-logs";
import { CropLogList } from "@/domains/farming/components/crop-log-list";
import { getCropLogComments } from "@/domains/farming/queries/get-crop-log-comments";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const t = await getTranslations("crowdfunding");

  const campaign = await getCampaignById(id);
  if (!campaign) {
    notFound();
  }

  const isCreator = session?.user?.id === campaign.creatorId;
  const isSetup = campaign.status === "SETUP";

  const [milestones, rewardTiers, contributions, creatorResult, updates, productionEntries] =
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
      getCropLogsByCampaign(id),
    ]);

  const creatorName = creatorResult[0]?.name ?? "";
  const creatorAvatar = creatorResult[0]?.avatar ?? null;
  const productionComments = await getCropLogComments(
    productionEntries.map((entry) => entry.id)
  );

  // A server-request snapshot prevents client re-renders from changing
  // time-sensitive campaign controls.
  // eslint-disable-next-line react-hooks/purity
  const currentTime = Date.now();

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
        currentTime={currentTime}
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

      {productionEntries.length > 0 && (
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">{t("productionTimeline")}</h2>
          <CropLogList
            entries={productionEntries}
            comments={productionComments}
            canComment={!!session?.user?.id}
          />
        </div>
      )}

      {isCreator && isSetup && (
        <div className="mt-8">
          <CampaignManagement
            campaign={campaign}
            milestones={milestones}
            rewardTiers={rewardTiers}
          />
        </div>
      )}
    </div>
  );
}
