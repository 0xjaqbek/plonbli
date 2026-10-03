import Link from "next/link";
import { useTranslations } from "next-intl";
import { Star, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import type { UserReview } from "../queries/get-reviews";

interface ReviewCardProps {
  review: UserReview;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const t = useTranslations("reputation");

  const initials = review.reviewer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/social/users/${review.reviewer.id}`}
            className="flex items-center gap-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={review.reviewer.avatar ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{review.reviewer.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < review.overall
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
        </div>

        {review.comment && (
          <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
        )}

        {review.dimensions && (
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            {review.dimensions.quality != null && (
              <span>
                {t("quality")}: {review.dimensions.quality}/5
              </span>
            )}
            {review.dimensions.communication != null && (
              <span>
                {t("communication")}: {review.dimensions.communication}/5
              </span>
            )}
            {review.dimensions.punctuality != null && (
              <span>
                {t("punctuality")}: {review.dimensions.punctuality}/5
              </span>
            )}
            {review.dimensions.accuracy != null && (
              <span>
                {t("accuracy")}: {review.dimensions.accuracy}/5
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {new Date(review.createdAt).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <Badge
            variant={
              review.verificationSource === "UNVERIFIED" ? "outline" : "secondary"
            }
            className="text-[10px] gap-1"
          >
            <ShieldCheck className="h-3 w-3" />
            {review.verificationSource === "ORDER"
              ? t("verifiedPurchase")
              : review.verificationSource === "CAMPAIGN"
                ? t("verifiedBacker")
                : t("legacyUnverified")}
            {" · "}
            {review.contentHash.slice(0, 8)}...
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
