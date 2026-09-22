"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users, Clock, Target } from "lucide-react";

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
};

export function CampaignCard({
  id,
  title,
  description,
  images,
  category,
  fundingModel,
  goalAmount,
  raisedAmount,
  backerCount,
  deadline,
  status,
  creatorName,
}: CampaignCardProps) {
  const t = useTranslations("crowdfunding");

  const goal = parseFloat(goalAmount);
  const raised = parseFloat(raisedAmount);
  const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link
      href={`/crowdfunding/${id}`}
      className="block rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
        {images[0] ? (
          <img
            src={images[0]}
            alt={title}
            className="h-full w-full object-cover"
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
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium">
              {raised.toLocaleString()} / {goal.toLocaleString()}
            </span>
            <span className="text-muted-foreground">
              {progress.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {backerCount}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {daysLeft > 0
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
