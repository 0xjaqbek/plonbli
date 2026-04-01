import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getReviewsByTarget } from "@/domains/reputation/queries/get-reviews";
import { getReputation } from "@/domains/reputation/queries/get-reputation";
import { ReviewCard } from "@/domains/reputation/components/review-card";
import { ReviewForm } from "@/domains/reputation/components/review-form";
import { ReputationBadge } from "@/domains/reputation/components/reputation-badge";

export default async function UserReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("reputation");
  const session = await auth();
  const reviews = await getReviewsByTarget(id);
  const stats = await getReputation(id);
  const isOwnProfile = session?.user?.id === id;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("reviews")}</h1>
        <ReputationBadge stats={stats} />
      </div>

      {session?.user?.id && !isOwnProfile && (
        <ReviewForm targetId={id} />
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
