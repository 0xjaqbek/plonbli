"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  MapPin,
  Calendar,
  Star,
  Leaf,
  Users,
  Package,
  BookOpen,
  Sprout,
} from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { ListingCard } from "./listing-card";
import { ShareButton } from "@/domains/social/components/share-button";
import { UserFollowButton } from "@/domains/social/components/user-follow-button";
import type { User } from "@/shared/db/schema";
import type { ListingWithDetails } from "../queries/get-listings";

interface FarmerProfileViewProps {
  farmer: User;
  listings: ListingWithDetails[];
  followerCount: number;
  cropLogCount: number;
  averageRating: number;
  reviewCount: number;
  farmingMethods: string[];
  categories: { id: string; name: string }[];
  isFollowing: boolean;
  currentUserId: string | null;
}

const methodKeys: Record<string, string> = {
  ECO: "methodEco",
  CONVENTIONAL: "methodConventional",
  OTHER: "methodOther",
};

export function FarmerProfileView({
  farmer,
  listings,
  followerCount,
  cropLogCount,
  averageRating,
  reviewCount,
  farmingMethods,
  categories,
  isFollowing,
  currentUserId,
}: FarmerProfileViewProps) {
  const t = useTranslations("farmer");
  const tAuth = useTranslations("auth");
  const tRep = useTranslations("reputation");
  const tFarm = useTranslations("farming");

  const initials = farmer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isOwnProfile = currentUserId === farmer.id;

  return (
    <div className="space-y-6">
      {/* Header: Avatar + Name + Location + Follow */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={farmer.avatar ?? undefined} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold">{farmer.name}</h1>
              <Badge variant="secondary" className="mt-1">
                {farmer.role === "FARMER"
                  ? tAuth("roleFarmer")
                  : farmer.role === "BOTH"
                    ? tAuth("roleBoth")
                    : tAuth("roleConsumer")}
              </Badge>
            </div>
          </div>

          {farmer.voivodeship && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
              <MapPin className="h-3.5 w-3.5" />
              {farmer.voivodeship}
              {farmer.county ? `, ${farmer.county}` : ""}
              {farmer.commune ? `, ${farmer.commune}` : ""}
            </p>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Calendar className="h-3 w-3" />
            {t("memberSince")}{" "}
            {new Date(farmer.createdAt).toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
            })}
          </p>
        </div>
      </div>

      {/* Bio */}
      {farmer.bio && (
        <p className="text-sm whitespace-pre-wrap">{farmer.bio}</p>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          href={`/social/users/${farmer.id}/reviews`}
          className="flex flex-col items-center p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <Star className="h-5 w-5 text-yellow-500 mb-1" />
          <span className="text-lg font-bold">
            {averageRating > 0 ? averageRating.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">
            {reviewCount} {tRep("reviewCount")}
          </span>
        </Link>

        <div className="flex flex-col items-center p-3 rounded-lg border">
          <Users className="h-5 w-5 text-blue-500 mb-1" />
          <span className="text-lg font-bold">{followerCount}</span>
          <span className="text-xs text-muted-foreground">
            {t("followers")}
          </span>
        </div>

        <div className="flex flex-col items-center p-3 rounded-lg border">
          <Package className="h-5 w-5 text-green-600 mb-1" />
          <span className="text-lg font-bold">{listings.length}</span>
          <span className="text-xs text-muted-foreground">
            {t("listings")}
          </span>
        </div>

        <Link
          href={`/farmers/${farmer.id}/crop-log`}
          className="flex flex-col items-center p-3 rounded-lg border hover:bg-accent transition-colors"
        >
          <BookOpen className="h-5 w-5 text-emerald-600 mb-1" />
          <span className="text-lg font-bold">{cropLogCount}</span>
          <span className="text-xs text-muted-foreground">
            {t("logEntries")}
          </span>
        </Link>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/social/users/${farmer.id}/reviews`}>
            <Star className="h-4 w-4 mr-1" />
            {tRep("reviews")}
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/farmers/${farmer.id}/crop-log`}>
            <Leaf className="h-4 w-4 mr-1" />
            {tFarm("cropLog")}
          </Link>
        </Button>
        {currentUserId && !isOwnProfile && (
          <UserFollowButton
            targetUserId={farmer.id}
            isFollowing={isFollowing}
          />
        )}
        <ShareButton entityType="FARMER" entityId={farmer.id} />
      </div>

      {/* Farming methods + categories */}
      {(farmingMethods.length > 0 || categories.length > 0) && (
        <div className="space-y-3">
          {farmingMethods.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-1.5">{t("farmingMethods")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {farmingMethods.map((method) => (
                  <Badge
                    key={method}
                    variant={method === "ECO" ? "default" : "secondary"}
                    className="gap-1"
                  >
                    {method === "ECO" && <Sprout className="h-3 w-3" />}
                    {t(methodKeys[method])}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {categories.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-1.5">{t("productCategories")}</h3>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => (
                  <Badge key={cat.id} variant="outline">
                    {cat.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Listings */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {t("listings")} ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("noListings")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((item) => (
              <ListingCard key={item.listing.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
