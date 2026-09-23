"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  Shield,
  Milestone,
  Gift,
  CheckCircle2,
  Wallet,
  ArrowLeft,
  Users,
  Share2,
  Check,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import type { CrowdfundingCampaign } from "@/shared/db/schema";
import type { CrowdfundingMilestone } from "@/shared/db/schema/crowdfunding-milestones";
import type { CrowdfundingRewardTier } from "@/shared/db/schema/crowdfunding-reward-tiers";
import { ContributeDialog } from "./contribute-dialog";
import { ActionBlink } from "./action-blink";

function getCurrencyLabel(mint: string): string {
  if (mint === "So11111111111111111111111111111111111111112") return "SOL";
  if (mint === "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") return "USDC";
  return mint.slice(0, 4);
}

type Props = {
  campaign: CrowdfundingCampaign;
  milestones: CrowdfundingMilestone[];
  rewardTiers: CrowdfundingRewardTier[];
  isCreator: boolean;
  creatorName?: string;
  creatorAvatar?: string | null;
  contributions?: Array<{
    id: string;
    amount: string;
    backerName: string;
    backerAvatar: string | null;
    createdAt: Date;
  }>;
};

export function CampaignDetail({
  campaign,
  milestones,
  rewardTiers,
  isCreator,
  creatorName,
  contributions,
}: Props) {
  const t = useTranslations("crowdfunding");
  const wallet = useAnchorWallet();
  const currencyLabel = getCurrencyLabel(campaign.currencyMint);

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
  const isSuccessful = campaign.status === "SUCCESSFUL";
  const progressBarGreen = isSuccessful || progress >= 100;
  const canContribute = isActive && !isCreator && !!campaign.campaignPubkey;
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    const url = `${window.location.origin}/crowdfunding/${campaign.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-6">
      {/* Back navigation + Share */}
      <div className="flex items-center justify-between">
        <Link
          href="/crowdfunding"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToList")}
        </Link>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          {copied ? (
            <Check className="mr-1.5 h-4 w-4 text-green-500" />
          ) : (
            <Share2 className="mr-1.5 h-4 w-4" />
          )}
          {copied ? t("linkCopied") : t("shareLink")}
        </Button>
      </div>

      {/* Image */}
      {campaign.images[0] && (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={campaign.images[0]}
            alt={campaign.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 672px"
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
        {creatorName && (
          <p className="text-sm text-muted-foreground">
            {t("by")} {creatorName}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              className={`h-full rounded-full transition-all ${
                progressBarGreen ? "bg-green-500" : "bg-primary"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-2xl font-bold">
              {raised.toLocaleString()} {currencyLabel}
            </span>
            <span className="text-muted-foreground">
              {t("of")} {goal.toLocaleString()} {currencyLabel}
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

        {/* Success indicator */}
        {isSuccessful && (
          <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            {t("goalReached")}
          </div>
        )}

        {/* Wallet explanation for non-crypto users */}
        {canContribute && !wallet && (
          <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <Wallet className="h-4 w-4" />
              {t("wallet.connectToContribute")}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {t("wallet.explanation")}
            </p>
          </div>
        )}

        {canContribute && (
          <ContributeDialog
            campaignId={campaign.id}
            campaignPubkey={campaign.campaignPubkey}
            currencyMint={campaign.currencyMint}
            rewardTiers={rewardTiers}
          />
        )}
      </div>

      {/* Alternative: contribute via Solana Action (no wallet connection needed) */}
      {canContribute && (
        <ActionBlink campaignId={campaign.id} />
      )}

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

      {/* Milestones (public view) */}
      {milestones.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Milestone className="h-5 w-5" />
            <h2 className="text-xl font-semibold">{t("backer.milestones")}</h2>
          </div>
          <div className="space-y-3">
            {milestones.map((ms, idx) => (
              <div
                key={ms.id}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    ms.status === "RELEASED"
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : ms.status === "APPROVED"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {ms.status === "RELEASED" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium">{ms.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ms.description}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    {t("backer.target")}:{" "}
                    {parseFloat(ms.targetAmount).toLocaleString()} {currencyLabel}
                  </p>
                </div>
                {ms.status !== "PENDING" && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      ms.status === "RELEASED"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {t(`backer.milestone_${ms.status}`)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reward tiers (public view) */}
      {rewardTiers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            <h2 className="text-xl font-semibold">
              {t("backer.rewardTiers")}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {rewardTiers.map((tier) => {
              const isFull =
                tier.maxBackers > 0 &&
                tier.currentBackers >= tier.maxBackers;
              return (
                <div
                  key={tier.id}
                  className={`rounded-lg border p-4 space-y-2 ${
                    isFull ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-medium">{tier.title}</h3>
                    <span className="text-lg font-bold text-primary">
                      {parseFloat(tier.price).toLocaleString()} {currencyLabel}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                  {tier.maxBackers > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {isFull
                        ? t("backer.tierFull")
                        : t("backer.tierRemaining", {
                            remaining: tier.maxBackers - tier.currentBackers,
                          })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent backers */}
      {contributions && contributions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-xl font-semibold">{t("recentBackers")}</h2>
          </div>
          <div className="space-y-2">
            {contributions.slice(0, 10).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {c.backerAvatar ? (
                      <Image
                        src={c.backerAvatar}
                        alt=""
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium">
                        {c.backerName?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-medium">{c.backerName}</span>
                </div>
                <span className="text-sm font-medium text-primary">
                  {parseFloat(c.amount).toLocaleString()} {currencyLabel}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
