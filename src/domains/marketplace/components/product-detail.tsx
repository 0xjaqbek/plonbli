"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { MapPin, Truck, Package, User } from "lucide-react";
import { deleteListing } from "../actions/delete-listing";
import { addToCart } from "@/domains/orders/actions/add-to-cart";
import { ShareButton } from "@/domains/social/components/share-button";
import { ImageLightbox } from "@/shared/ui/image-lightbox";
import { Input } from "@/shared/ui/input";
import type { ListingDetail } from "../queries/get-listing";
import { AvailabilitySelect } from "./availability-select";

const DELIVERY_ICONS: Record<string, typeof MapPin> = {
  PICKUP: MapPin,
  DELIVERY: Truck,
  DROP_POINT: Package,
};

interface ProductDetailProps {
  listing: ListingDetail;
  isOwner: boolean;
}

export function ProductDetail({ listing, isOwner }: ProductDetailProps) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const tMarketplace = useTranslations("marketplace");
  const tOrders = useTranslations("orders");

  function unitLabel(unit: string) {
    return unit === "KG" ? t("unitKg") : unit === "PIECE" ? t("unitPiece") : unit === "LITER" ? t("unitLiter") : t("unitBunch");
  }
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [cartQty, setCartQty] = useState(1);
  const [cartSuccess, setCartSuccess] = useState(false);

  const { product } = listing;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteListing(listing.id);
      if (result.success) {
        router.push("/marketplace");
      }
    });
  }

  function handleAddToCart() {
    startTransition(async () => {
      const result = await addToCart({ listingId: listing.id, quantity: cartQty });
      if (result.success) {
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 3000);
      }
    });
  }

  return (
    <div className="space-y-6">
      {product.images.length > 0 ? (
        <ImageLightbox images={product.images}>
          {(onOpen) => (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {product.images.map((url, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg relative cursor-pointer"
                  onClick={() => onOpen(i)}
                >
                  <Image
                    src={url}
                    alt={`${product.name} ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </ImageLightbox>
      ) : (
        <div className="aspect-[2/1] rounded-lg bg-muted flex items-center justify-center">
          <span className="text-6xl">🌱</span>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{product.category.name}</Badge>
          <Badge
            variant={product.method === "ECO" ? "default" : "secondary"}
          >
            {product.method === "ECO"
              ? t("methodEco")
              : product.method === "CONVENTIONAL"
                ? t("methodConventional")
                : t("methodOther")}
          </Badge>
          <Badge
            variant={
              listing.availability === "AVAILABLE"
                ? "default"
                : listing.availability === "SEASONAL"
                  ? "secondary"
                  : "destructive"
            }
          >
            {listing.availability === "AVAILABLE"
              ? tMarketplace("available")
              : listing.availability === "SEASONAL"
                ? tMarketplace("seasonal")
                : tMarketplace("outOfStock")}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <ShareButton entityType="PRODUCT" entityId={product.id} />
        </div>

        <p className="text-3xl font-bold text-primary mt-2">
          {Number(listing.price).toFixed(2)} zl
          <span className="text-lg font-normal text-muted-foreground">
            {" "}
            / {unitLabel(listing.unit)}
          </span>
        </p>

        {listing.quantityAvailable && (
          <p className="text-sm text-muted-foreground mt-1">
            {t("quantity")}: {Number(listing.quantityAvailable)}{" "}
            {unitLabel(listing.unit)}
          </p>
        )}
      </div>

      {product.description && (
        <>
          <Separator />
          <div>
            <h2 className="font-semibold mb-2">{t("description")}</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        </>
      )}

      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <Separator />
      <div>
        <h2 className="font-semibold mb-3">{t("delivery")}</h2>
        <div className="space-y-3">
          {listing.deliveryOptions.map((opt, i) => {
            const Icon = DELIVERY_ICONS[opt.type] ?? Package;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {opt.type === "PICKUP"
                      ? t("deliveryPickup")
                      : opt.type === "DELIVERY"
                        ? t("deliveryDelivery")
                        : t("deliveryDropPoint")}
                  </p>
                  {opt.address && (
                    <p className="text-sm text-muted-foreground">
                      {opt.address}
                    </p>
                  )}
                  {opt.hours && (
                    <p className="text-sm text-muted-foreground">
                      {opt.hours}
                    </p>
                  )}
                  {opt.radius && (
                    <p className="text-sm text-muted-foreground">
                      {t("deliveryRadius")}: {opt.radius} km
                    </p>
                  )}
                  {opt.cost !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {t("deliveryCost")}: {opt.cost} zl
                    </p>
                  )}
                  {opt.minAmount !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {t("deliveryMinAmount")}: {opt.minAmount} zl
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isOwner && (
        <div className="flex items-center gap-3">
          <Input
            type="number"
            min={1}
            value={cartQty}
            onChange={(e) => setCartQty(Number(e.target.value))}
            className="w-20"
          />
          <Button onClick={handleAddToCart} disabled={isPending}>
            {cartSuccess ? tOrders("addedToCart") : tOrders("addToCart")}
          </Button>
        </div>
      )}

      <Separator />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {product.farmer.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.farmer.voivodeship && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {product.farmer.voivodeship}
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href={`/farmers/${product.farmer.id}`}>
              {t("farmerProfile")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {isOwner && (
        <>
          <Separator />
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link href={`/marketplace/${listing.id}/edit`}>
                {tCommon("edit")}
              </Link>
            </Button>
            {!showConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
              >
                {tCommon("delete")}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-destructive">
                  {t("confirmDelete")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {tCommon("delete")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                >
                  {tCommon("cancel")}
                </Button>
              </div>
            )}
          </div>
          <AvailabilitySelect listingId={listing.id} value={listing.availability} />
        </>
      )}
    </div>
  );
}
