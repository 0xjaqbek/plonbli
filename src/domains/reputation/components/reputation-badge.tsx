import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import type { ReputationStats } from "../types";

interface ReputationBadgeProps {
  stats: ReputationStats;
}

export function ReputationBadge({ stats }: ReputationBadgeProps) {
  const t = useTranslations("reputation");

  if (stats.reviewCount === 0) {
    return (
      <span className="text-xs text-muted-foreground">{t("noReviews")}</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-medium">
          {stats.averageRating.toFixed(1)}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        ({stats.reviewCount} {t("reviewCount")})
      </span>
    </div>
  );
}
