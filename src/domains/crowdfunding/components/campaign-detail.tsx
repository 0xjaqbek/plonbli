"use client";

import { useTranslations } from "next-intl";
import { Users, Clock, Target, Shield } from "lucide-react";
import type { CrowdfundingCampaign } from "@/shared/db/schema";
import { Button } from "@/shared/ui/button";

type Props = {
  campaign: CrowdfundingCampaign;
};

export function CampaignDetail({ campaign }: Props) {
  const t = useTranslations("crowdfunding");

  const goal = parseFloat(campaign.goalAmount);
  const raised = parseFloat(campaign.raisedAmount);
  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(campaign.deadline).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );
  const isActive = campaign.status === "ACTIVE";

  return (
    <div className="space-y-6">
      {/* Image */}
      {campaign.images[0] && (
        <div className="aspect-video w-full overflow-hidden rounded-lg">
          <img
            src={campaign.images[0]}
            alt={campaign.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            {t(`category.${campaign.category}`)}
          </span>
          <span className="rounded-full bg-muted px-3 py-1 text-sm">
            {campaign.fundingModel === "ALL_OR_NOTHING"
              ? t("form.allOrNothing")
              : t("form.keepWhatYouRaise")}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{campaign.title}</h1>
      </div>

      {/* Progress */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-2xl font-bold">
              {raised.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              {t("of")} {goal.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{progress.toFixed(0)}%</p>
            <p className="text-sm text-muted-foreground">{t("funded")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{campaign.backerCount}</p>
            <p className="text-sm text-muted-foreground">{t("backers")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{daysLeft}</p>
            <p className="text-sm text-muted-foreground">
              {t("daysRemaining")}
            </p>
          </div>
        </div>

        {isActive && (
          <Button className="w-full" size="lg">
            <Target className="mr-2 h-5 w-5" />
            {t("contribute")}
          </Button>
        )}
      </div>

      {/* On-chain verification */}
      {campaign.campaignPubkey && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 p-3 text-sm">
          <Shield className="h-4 w-4 text-green-600" />
          <span>{t("onChainVerified")}</span>
          <code className="ml-auto text-xs text-muted-foreground truncate max-w-[200px]">
            {campaign.campaignPubkey}
          </code>
        </div>
      )}

      {/* Description */}
      <div className="prose dark:prose-invert max-w-none">
        <h2>{t("about")}</h2>
        <p className="whitespace-pre-wrap">{campaign.description}</p>
      </div>
    </div>
  );
}
