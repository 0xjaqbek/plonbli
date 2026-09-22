import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getCampaigns } from "@/domains/crowdfunding/queries/get-campaigns";
import { CampaignGrid } from "@/domains/crowdfunding/components/campaign-grid";
import { WalletButton } from "@/domains/crowdfunding/components/wallet-button";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

const PAGE_SIZE = 12;

export default async function CrowdfundingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("crowdfunding");
  const session = await auth();
  const params = await searchParams;

  const categoryFilter = typeof params.category === "string" ? params.category : undefined;
  const campaigns = await getCampaigns({
    status: typeof params.status === "string" ? params.status : undefined,
    category: categoryFilter,
    limit: PAGE_SIZE,
  });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <div className="flex items-center gap-3">
          <WalletButton />
          {session?.user ? (
            <Button asChild>
              <Link href="/crowdfunding/create">
                <Plus className="mr-2 h-4 w-4" />
                {t("createCampaign")}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link href="/auth/login">
                {t("loginToCreate")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link
          href="/crowdfunding"
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            !params.category
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("filter.all")}
        </Link>
        {["FARMER_INVESTMENT", "GROUP_PRE_ORDER", "COMMUNITY_PROJECT"].map(
          (cat) => (
            <Link
              key={cat}
              href={`/crowdfunding?category=${cat}`}
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                params.category === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(`category.${cat}`)}
            </Link>
          )
        )}
      </div>

      <CampaignGrid
        initialCampaigns={campaigns}
        category={categoryFilter}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
