import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getProxyFarmer } from "@/domains/marketplace/queries/get-proxy-farmer";
import { getReviewsByProxyFarmer } from "@/domains/reputation/queries/get-reviews";
import { getProxyFarmerReputation } from "@/domains/reputation/queries/get-reputation";
import { ReviewCard } from "@/domains/reputation/components/review-card";
import { ReviewForm } from "@/domains/reputation/components/review-form";
import { ReputationBadge } from "@/domains/reputation/components/reputation-badge";

export default async function ProxyFarmerReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("reputation");
  const session = await auth();

  const profile = await getProxyFarmer(id);
  if (!profile) notFound();

  const [reviews, stats] = await Promise.all([
    getReviewsByProxyFarmer(id),
    getProxyFarmerReputation(id),
  ]);

  const isCreator = session?.user?.id === profile.creatorId;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("reviews")}</h1>
          <p className="text-sm text-muted-foreground">{profile.name}</p>
        </div>
        <ReputationBadge stats={stats} />
      </div>

      {session?.user?.id && !isCreator && (
        <ReviewForm proxyFarmerId={id} />
      )}

      {reviews.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("noReviews")}
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
