import Link from "next/link";
import { useTranslations } from "next-intl";
import { MapPin, Calendar, Star, Leaf } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ListingCard } from "./listing-card";
import { ShareButton } from "@/domains/social/components/share-button";
import type { User } from "@/shared/db/schema";
import type { ListingWithDetails } from "../queries/get-listings";

interface FarmerProfileViewProps {
  farmer: User;
  listings: ListingWithDetails[];
}

export function FarmerProfileView({
  farmer,
  listings,
}: FarmerProfileViewProps) {
  const t = useTranslations("farmer");
  const tAuth = useTranslations("auth");
  const tRep = useTranslations("reputation");
  const tFarm = useTranslations("farming");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{farmer.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {farmer.voivodeship && (
            <p className="text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {farmer.voivodeship}
              {farmer.commune ? `, ${farmer.commune}` : ""}
            </p>
          )}
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("memberSince")}{" "}
            {new Date(farmer.createdAt).toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
            })}
          </p>
          <Badge variant="secondary">
            {farmer.role === "FARMER"
              ? tAuth("roleFarmer")
              : farmer.role === "BOTH"
                ? tAuth("roleBoth")
                : tAuth("roleConsumer")}
          </Badge>
          <div className="flex gap-2 pt-2">
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
            <ShareButton entityType="FARMER" entityId={farmer.id} />
          </div>
        </CardContent>
      </Card>

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
