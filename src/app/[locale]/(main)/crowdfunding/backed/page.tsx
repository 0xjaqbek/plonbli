import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { redirect } from "next/navigation";
import { getBackedCampaigns } from "@/domains/crowdfunding/queries/get-contributions";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import Link from "next/link";
import Image from "next/image";
import { Target } from "lucide-react";
import { ClaimRefundButton } from "./claim-refund-button";
import { getCurrencyLabel } from "@/domains/crowdfunding/lib/constants";

export default async function BackedCampaignsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const t = await getTranslations("crowdfunding");

  const backedCampaigns = await getBackedCampaigns(session.user.id);

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("backed.title")}</h1>
      </div>

      {backedCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {t("backed.noBacked")}
          </p>
          <Button asChild variant="outline">
            <Link href="/crowdfunding">{t("backed.browseAll")}</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {backedCampaigns.map((item) => (
            <Card key={item.contribution.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {item.campaign.images?.[0] ? (
                        <Image
                          src={item.campaign.images[0]}
                          alt={item.campaign.title}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Target className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle>
                        <Link
                          href={`/crowdfunding/${item.campaign.id}`}
                          className="hover:underline"
                        >
                          {item.campaign.title}
                        </Link>
                      </CardTitle>
                    </div>
                  </div>
                  <Badge
                    variant={
                      item.campaign.status === "ACTIVE"
                        ? "default"
                        : item.campaign.status === "SUCCESSFUL"
                          ? "secondary"
                          : item.campaign.status === "FAILED"
                            ? "destructive"
                            : "outline"
                    }
                  >
                    {t(`status.${item.campaign.status}`)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-medium">
                    {t("backed.contributedAmount", {
                      amount: `${parseFloat(item.contribution.amount).toLocaleString()} ${getCurrencyLabel(item.campaign.currencyMint)}`,
                    })}
                  </span>

                  {item.rewardTier?.title ? (
                    <span className="text-muted-foreground">
                      {t("backed.rewardTier", {
                        tier: item.rewardTier.title,
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("backed.noReward")}
                    </span>
                  )}

                  {/* Progress */}
                  <span className="text-muted-foreground">
                    {parseFloat(item.campaign.raisedAmount).toLocaleString()} {getCurrencyLabel(item.campaign.currencyMint)}{" "}
                    {t("of")}{" "}
                    {parseFloat(item.campaign.goalAmount).toLocaleString()} {getCurrencyLabel(item.campaign.currencyMint)}
                  </span>

                  {/* Refund status for FAILED campaigns */}
                  {item.campaign.status === "FAILED" && (
                    <div className="ml-auto">
                      {item.contribution.refunded ? (
                        <Badge variant="secondary">
                          {t("backed.refundClaimed")}
                        </Badge>
                      ) : (
                        item.campaign.campaignPubkey &&
                        item.contribution.contributionPubkey ? (
                          <ClaimRefundButton
                            contributionId={item.contribution.id}
                            amount={item.contribution.amount}
                            campaignPubkey={item.campaign.campaignPubkey}
                            contributionPubkey={item.contribution.contributionPubkey}
                            currencyMint={item.campaign.currencyMint}
                          />
                        ) : (
                          <Badge variant="outline">
                            {t("backed.legacyRefundUnavailable")}
                          </Badge>
                        )
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
