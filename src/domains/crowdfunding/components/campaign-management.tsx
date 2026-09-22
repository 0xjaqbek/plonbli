"use client";

import { useTranslations } from "next-intl";
import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "@/shared/ui/button";
import { Trash2, Rocket, Milestone, Gift, AlertCircle, Wallet } from "lucide-react";
import type { CrowdfundingCampaign } from "@/shared/db/schema";
import type { CrowdfundingMilestone } from "@/shared/db/schema/crowdfunding-milestones";
import type { CrowdfundingRewardTier } from "@/shared/db/schema/crowdfunding-reward-tiers";
import { MilestoneForm } from "./milestone-form";
import { RewardTierForm } from "./reward-tier-form";
import { deleteMilestoneAction } from "../actions/delete-milestone";
import { deleteRewardTierAction } from "../actions/delete-reward-tier";
import { activateCampaignAction } from "../actions/activate-campaign";
import { useCreateCampaignOnChain } from "../hooks/use-create-campaign-onchain";

type Props = {
  campaign: CrowdfundingCampaign;
  milestones: CrowdfundingMilestone[];
  rewardTiers: CrowdfundingRewardTier[];
  campaignIndex: number;
};

export function CampaignManagement({
  campaign,
  milestones,
  rewardTiers,
  campaignIndex,
}: Props) {
  const t = useTranslations("crowdfunding.manage");
  const router = useRouter();
  const wallet = useAnchorWallet();
  const { setVisible } = useWalletModal();
  const [isPending, startTransition] = useTransition();
  const [activateError, setActivateError] = useState<string | null>(null);
  const { createCampaign, loading: onChainLoading, error: onChainError } =
    useCreateCampaignOnChain();

  function handleDeleteMilestone(milestoneId: string) {
    startTransition(async () => {
      await deleteMilestoneAction(milestoneId, campaign.id);
      router.refresh();
    });
  }

  function handleDeleteTier(tierId: string) {
    startTransition(async () => {
      await deleteRewardTierAction(tierId, campaign.id);
      router.refresh();
    });
  }

  async function handleActivate() {
    setActivateError(null);

    if (!wallet) {
      setVisible(true);
      return;
    }

    // Confirmation step — this is an irreversible on-chain action
    const confirmed = window.confirm(t("activateConfirm"));
    if (!confirmed) return;

    // Step 1: Create campaign on-chain
    const onChainResult = await createCampaign({
      campaignIndex,
      goalAmount: parseFloat(campaign.goalAmount),
      deadline: new Date(campaign.deadline),
      fundingModel: campaign.fundingModel as "ALL_OR_NOTHING" | "KEEP_WHAT_YOU_RAISE",
      currencyMint: campaign.currencyMint,
      title: campaign.title,
      description: campaign.description,
    });

    if (!onChainResult) {
      setActivateError(onChainError || t("onChainFailed"));
      return;
    }

    // Step 2: Activate in DB and save pubkey
    startTransition(async () => {
      const result = await activateCampaignAction(
        campaign.id,
        onChainResult.campaignPubkey,
        onChainResult.signature
      );
      if (result.error) {
        // On-chain succeeded but DB failed — inform user with pubkey for manual recovery
        setActivateError(
          `${result.error}\n${t("onChainCreatedButDbFailed")}: ${onChainResult.campaignPubkey}`
        );
      } else {
        router.refresh();
      }
    });
  }

  const isActivating = isPending || onChainLoading;

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

        <MilestoneForm campaignId={campaign.id} />
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

        <RewardTierForm campaignId={campaign.id} />
      </section>

      {/* Activate button */}
      <div className="border-t pt-6">
        {(activateError || onChainError) && (
          <p className="text-sm text-destructive mb-3">
            {activateError || onChainError}
          </p>
        )}

        {!wallet && (
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1.5">
            <Wallet className="h-4 w-4" />
            {t("connectWalletFirst")}
          </p>
        )}

        <Button
          size="lg"
          className="w-full"
          onClick={handleActivate}
          disabled={isActivating}
        >
          <Rocket className="mr-2 h-5 w-5" />
          {isActivating
            ? onChainLoading
              ? t("signingOnChain")
              : t("activating")
            : wallet
              ? t("activate")
              : t("connectAndActivate")}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("activateHint")}
        </p>
      </div>
    </div>
  );
}
