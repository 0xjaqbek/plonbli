import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { useTranslations } from "next-intl";
import type { ListingWithDetails } from "../queries/get-listings";
import { ListingCardActions } from "./listing-card-actions";

const METHOD_COLORS: Record<string, string> = {
  ECO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CONVENTIONAL: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  OTHER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

interface ListingCardProps {
  item: ListingWithDetails;
  hideImage?: boolean;
  showActions?: boolean;
}

export function ListingCard({ item, hideImage, showActions }: ListingCardProps) {
  const t = useTranslations("product");
  const { listing, product, farmer, category } = item;

  return (
    <div>
      <Link href={`/marketplace/${listing.id}`}>
        <Card className="h-full hover:shadow-md transition-shadow">
          {!hideImage && (product.images.length > 0 ? (
            <div className="aspect-[4/3] overflow-hidden rounded-t-lg relative">
              <Image
                src={product.images[0]}
                alt={product.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="aspect-[4/3] rounded-t-lg bg-muted flex items-center justify-center">
              <span className="text-4xl text-muted-foreground">🌱</span>
            </div>
          ))}
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <span>{category.name}</span>
              <Badge
                variant="secondary"
                className={METHOD_COLORS[product.method]}
              >
                {product.method === "ECO" ? t("methodEco") : product.method === "CONVENTIONAL" ? t("methodConventional") : t("methodOther")}
              </Badge>
            </div>
            <CardTitle className="text-base line-clamp-2">
              {product.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <p className="text-lg font-bold text-primary">
              {Number(listing.price).toFixed(2)} zl
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {listing.unit === "KG" ? t("unitKg") : listing.unit === "PIECE" ? t("unitPiece") : listing.unit === "LITER" ? t("unitLiter") : t("unitBunch")}
              </span>
            </p>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            <span>
              {farmer.name}
              {farmer.voivodeship ? ` · ${farmer.voivodeship}` : ""}
            </span>
          </CardFooter>
        </Card>
      </Link>
      {showActions && <ListingCardActions listingId={listing.id} />}
    </div>
  );
}
