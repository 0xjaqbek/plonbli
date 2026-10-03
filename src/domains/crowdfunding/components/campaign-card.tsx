"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Users, Clock, Target, CheckCircle2 } from "lucide-react";
import { getCurrencyLabel } from "../lib/constants";

type CampaignCardProps = {
  id: string;
  title: string;
  description: string;
  images: string[];
  category: string;
  fundingModel: string;
  goalAmount: string;
  raisedAmount: string;
  backerCount: number;
  deadline: Date;
  status: string;
  creatorName: string;
  creatorAvatar: string | null;
  currencyMint?: string;
  referenceTime: number;
};

export function CampaignCard({
  id,
  title,
  description,
  images,
  category,
  goalAmount,
  raisedAmount,
  backerCount,
  deadline,
  status,
  creatorName,
  currencyMint,
  referenceTime,
}: CampaignCardProps) {
  const t = useTranslations("crowdfunding");
  const currencyLabel = getCurrencyLabel(currencyMint);

  const goal = parseFloat(goalAmount);
  const raised = parseFloat(raisedAmount);
  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const rawDaysLeft = Math.ceil(
    (new Date(deadline).getTime() - referenceTime) / (1000 * 60 * 60 * 24)
  );
  const daysLeft = Math.max(0, rawDaysLeft);

  const isSuccessful = status === "SUCCESSFUL";
  const progressBarGreen = isSuccessful || progress >= 100;

  return (
    <Link
      href={`/crowdfunding/${id}`}
      className="block rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {/* Image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
        {images[0] ? (
          <Image
            src={images[0]}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Target className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Category badge */}
        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {t(`category.${category}`)}
        </span>

        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-2">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
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
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {raised.toLocaleString()} {currencyLabel} / {goal.toLocaleString()} {currencyLabel}
            </span>
            <span className="text-muted-foreground">
              {progress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Goal reached indicator */}
        {progressBarGreen && (
          <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {t("goalReached")}
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {backerCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {daysLeft === 0 && status === "ACTIVE"
              ? t("lastDay")
              : daysLeft > 0 && status === "ACTIVE"
                ? t("daysLeft", { count: daysLeft })
                : t("ended")}
          </span>
        </div>

        {/* Creator */}
        <p className="text-xs text-muted-foreground">
          {t("by")} {creatorName}
        </p>
      </div>
    </Link>
  );
}
