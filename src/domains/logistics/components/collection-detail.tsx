import { useTranslations } from "next-intl";
import { CalendarDays, MapPin, Users, Package } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import type { CollectionDetail as CollectionDetailType } from "../queries/get-collection";

interface CollectionDetailProps {
  collection: CollectionDetailType;
}

const statusKeys: Record<string, string> = {
  COLLECTING: "statusCollecting",
  ORDERED: "statusOrdered",
  IN_DELIVERY: "statusInDelivery",
  RECEIVED: "statusReceived",
  CANCELLED: "statusCancelled",
};

export function CollectionDetail({ collection }: CollectionDetailProps) {
  const t = useTranslations("logistics");

  const totalQuantity = collection.items.reduce(
    (sum, item) => sum + parseFloat(item.quantity),
    0
  );

  const progress = collection.targetAmount
    ? Math.min(100, (totalQuantity / parseFloat(collection.targetAmount)) * 100)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{collection.title}</CardTitle>
            <Badge>{t(statusKeys[collection.status])}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {collection.productName} — {collection.listing.price} zl/
            {collection.listing.unit.toLowerCase()}
          </p>

          {collection.description && (
            <p className="text-sm">{collection.description}</p>
          )}

          {progress !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{t("progress")}</span>
                <span>
                  {totalQuantity} / {collection.targetAmount} ({Math.round(progress)}%)
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {collection.pickupAddress && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {collection.pickupAddress}
              </span>
            )}
            {collection.pickupDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                {new Date(collection.pickupDate).toLocaleDateString("pl-PL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {t("coordinator")}: {collection.coordinator.name}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("participants")} ({collection.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collection.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("noCollections")}
            </p>
          ) : (
            <div className="space-y-3">
              {collection.items.map((item) => (
                <div
                  key={item.userId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {item.user.name?.charAt(0) ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{item.user.name}</p>
                      {item.note && (
                        <p className="text-xs text-muted-foreground">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-sm">
                    <Package className="h-3 w-3" />
                    {item.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
