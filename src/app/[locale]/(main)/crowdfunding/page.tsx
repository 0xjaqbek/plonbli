import { getTranslations } from "next-intl/server";
import { getCampaigns } from "@/domains/crowdfunding/queries/get-campaigns";
import { CampaignCard } from "@/domains/crowdfunding/components/campaign-card";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function CrowdfundingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("crowdfunding");
  const params = await searchParams;

  const campaigns = await getCampaigns({
    status: typeof params.status === "string" ? params.status : undefined,
    category: typeof params.category === "string" ? params.category : undefined,
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/crowdfunding/create">
            <Plus className="mr-2 h-4 w-4" />
            {t("createCampaign")}
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t("noCampaigns")}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              {...campaign}
              deadline={campaign.deadline}
            />
          ))}
        </div>
      )}
    </div>
  );
}
