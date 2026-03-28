import Link from "next/link";
import { useTranslations } from "next-intl";
import { Users, Package } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { CollectionWithDetails } from "../queries/get-collections";

interface CollectionCardProps {
  collection: CollectionWithDetails;
  groupId: string;
}

const statusKeys: Record<string, string> = {
  COLLECTING: "statusCollecting",
  ORDERED: "statusOrdered",
  IN_DELIVERY: "statusInDelivery",
  RECEIVED: "statusReceived",
  CANCELLED: "statusCancelled",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  COLLECTING: "default",
  ORDERED: "secondary",
  IN_DELIVERY: "secondary",
  RECEIVED: "outline",
  CANCELLED: "destructive",
};

export function CollectionCard({ collection, groupId }: CollectionCardProps) {
  const t = useTranslations("logistics");

  const progress = collection.targetAmount
    ? Math.min(
        100,
        (parseFloat(collection.totalQuantity) /
          parseFloat(collection.targetAmount)) *
          100
      )
    : null;

  return (
    <Link
      href={`/social/groups/${groupId}/collections/${collection.id}`}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{collection.title}</CardTitle>
            <Badge variant={statusVariants[collection.status]}>
              {t(statusKeys[collection.status])}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {collection.productName} — {collection.listing.price} zl/
            {collection.listing.unit.toLowerCase()}
          </p>

          {collection.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {collection.description}
            </p>
          )}

          {progress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t("progress")}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {collection.participantCount} {t("participants")}
            </span>
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {collection.totalQuantity} {t("quantity")}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("coordinator")}: {collection.coordinator.name}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
