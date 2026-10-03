import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { redirect } from "next/navigation";
import { getCampaigns } from "@/domains/crowdfunding/queries/get-campaigns";
import { CampaignCard } from "@/domains/crowdfunding/components/campaign-card";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function MyCampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const t = await getTranslations("crowdfunding");

  const campaigns = await getCampaigns({ creatorId: session.user.id });
  // A single server-request snapshot keeps all client cards deterministic.
  // eslint-disable-next-line react-hooks/purity
  const referenceTime = Date.now();

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("myCampaigns.title")}</h1>
        <Button asChild>
          <Link href="/crowdfunding/create">
            <Plus className="mr-2 h-4 w-4" />
            {t("createCampaign")}
          </Link>
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {t("myCampaigns.noCampaigns")}
          </p>
          <Button asChild variant="outline">
            <Link href="/crowdfunding/create">
              <Plus className="mr-2 h-4 w-4" />
              {t("myCampaigns.createFirst")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="relative">
              <div className="absolute top-3 right-3 z-10">
                <Badge
                  variant={
                    campaign.status === "ACTIVE"
                      ? "default"
                      : campaign.status === "SUCCESSFUL"
                        ? "secondary"
                        : campaign.status === "FAILED"
                          ? "destructive"
                          : "outline"
                  }
                >
                  {t(`status.${campaign.status}`)}
                </Badge>
              </div>
              <CampaignCard
                {...campaign}
                deadline={campaign.deadline}
                referenceTime={referenceTime}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
