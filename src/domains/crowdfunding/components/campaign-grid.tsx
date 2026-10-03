"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { CampaignCard } from "./campaign-card";
import { loadMoreCampaigns } from "../actions/load-more-campaigns";

type Campaign = {
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
  currencyMint: string;
};

type Props = {
  initialCampaigns: Campaign[];
  category?: string;
  pageSize: number;
  referenceTime: number;
};

export function CampaignGrid({ initialCampaigns, category, pageSize, referenceTime }: Props) {
  const t = useTranslations("crowdfunding");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [hasMore, setHasMore] = useState(initialCampaigns.length >= pageSize);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    startTransition(async () => {
      const more = await loadMoreCampaigns({
        offset: campaigns.length,
        limit: pageSize,
        category,
      });
      if (more.length < pageSize) {
        setHasMore(false);
      }
      setCampaigns((prev) => [...prev, ...more]);
    });
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t("noCampaigns")}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            {...campaign}
            deadline={campaign.deadline}
            referenceTime={referenceTime}
          />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? t("loading.campaigns") : t("loadMore")}
          </Button>
        </div>
      )}
    </>
  );
}
