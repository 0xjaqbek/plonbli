"use client";

import { useTranslations } from "next-intl";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Trash2, Rocket, Milestone, Gift, AlertCircle } from "lucide-react";
import type { CrowdfundingMilestone } from "@/shared/db/schema/crowdfunding-milestones";
import type { CrowdfundingRewardTier } from "@/shared/db/schema/crowdfunding-reward-tiers";
import { MilestoneForm } from "./milestone-form";
import { RewardTierForm } from "./reward-tier-form";
import { deleteMilestoneAction } from "../actions/delete-milestone";
import { deleteRewardTierAction } from "../actions/delete-reward-tier";
import { activateCampaignAction } from "../actions/activate-campaign";

type Props = {
  campaignId: string;
  milestones: CrowdfundingMilestone[];
  rewardTiers: CrowdfundingRewardTier[];
};

export function CampaignManagement({
  campaignId,
  milestones,
  rewardTiers,
}: Props) {
  const t = useTranslations("crowdfunding.manage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activateError, setActivateError] = useState<string | null>(null);

  function handleDeleteMilestone(milestoneId: string) {
    startTransition(async () => {
      await deleteMilestoneAction(milestoneId, campaignId);
      router.refresh();
    });
  }

  function handleDeleteTier(tierId: string) {
    startTransition(async () => {
      await deleteRewardTierAction(tierId, campaignId);
      router.refresh();
    });
  }

  function handleActivate() {
    setActivateError(null);
    startTransition(async () => {
      const result = await activateCampaignAction(campaignId);
      if (result.error) {
        setActivateError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Setup banner */}
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4 text-sm">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
        <p>{t("setupBanner")}</p>
      </div>

      {/* Milestones section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Milestone className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{t("milestones")}</h2>
          <span className="text-sm text-muted-foreground">
            ({milestones.length})
          </span>
        </div>

        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noMilestones")}</p>
        ) : (
          <div className="space-y-3">
            {milestones.map((ms, idx) => (
              <div
                key={ms.id}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{ms.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ms.description}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {t("target")}: {parseFloat(ms.targetAmount).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteMilestone(ms.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <MilestoneForm campaignId={campaignId} />
      </section>

      {/* Reward tiers section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{t("rewardTiers")}</h2>
          <span className="text-sm text-muted-foreground">
            ({rewardTiers.length})
          </span>
        </div>

        {rewardTiers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noTiers")}</p>
        ) : (
          <div className="space-y-3">
            {rewardTiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-medium">{tier.title}</h3>
                    <span className="text-lg font-bold text-primary">
                      {parseFloat(tier.price).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tier.description}
                  </p>
                  {tier.maxBackers > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("tierLimit", {
                        current: tier.currentBackers,
                        max: tier.maxBackers,
                      })}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteTier(tier.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <RewardTierForm campaignId={campaignId} />
      </section>

      {/* Activate button */}
      <div className="border-t pt-6">
        {activateError && (
          <p className="text-sm text-destructive mb-3">{activateError}</p>
        )}
        <Button
          size="lg"
          className="w-full"
          onClick={handleActivate}
          disabled={isPending}
        >
          <Rocket className="mr-2 h-5 w-5" />
          {isPending ? t("activating") : t("activate")}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("activateHint")}
        </p>
      </div>
    </div>
  );
}
