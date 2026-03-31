import Link from "next/link";
import { useTranslations } from "next-intl";
import { CalendarDays, MapPin, Tractor, Leaf, ShoppingBasket } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import type { SharedEntityData } from "../queries/resolve-shared-entity";

interface SharedEntityPreviewProps {
  entity: SharedEntityData;
}

const eventTypeKeys: Record<string, string> = {
  MARKET: "typeMarket",
  OPEN_DAY: "typeOpenDay",
  MEETUP: "typeMeetup",
  OTHER: "typeOther",
};

const cropLogTypeKeys: Record<string, string> = {
  PLANTING: "typePlanting",
  GROWING: "typeGrowing",
  TREATMENT: "typeTreatment",
  HARVEST: "typeHarvest",
  OTHER: "typeOther",
};

const methodKeys: Record<string, string> = {
  ECO: "methodEco",
  CONVENTIONAL: "methodConventional",
  OTHER: "methodOther",
};

const unitKeys: Record<string, string> = {
  KG: "unitKg",
  PIECE: "unitPiece",
  LITER: "unitLiter",
  BUNCH: "unitBunch",
};

export function SharedEntityPreview({ entity }: SharedEntityPreviewProps) {
  switch (entity.type) {
    case "FARMER":
      return <FarmerPreview entity={entity} />;
    case "EVENT":
      return <EventPreview entity={entity} />;
    case "CROP_LOG":
      return <CropLogPreview entity={entity} />;
    case "PRODUCT":
      return <ProductPreview entity={entity} />;
  }
}

function FarmerPreview({
  entity,
}: {
  entity: Extract<SharedEntityData, { type: "FARMER" }>;
}) {
  const t = useTranslations("social");
  const initials = entity.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={`/farmers/${entity.id}`}>
      <div className="flex items-center gap-3 border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        <Avatar className="h-10 w-10">
          <AvatarImage src={entity.avatar ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Tractor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium truncate">{entity.name}</p>
          </div>
          {entity.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{entity.location}</span>
            </div>
          )}
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {t("sharedFarmer")}
        </Badge>
      </div>
    </Link>
  );
}

function EventPreview({
  entity,
}: {
  entity: Extract<SharedEntityData, { type: "EVENT" }>;
}) {
  const t = useTranslations("event");

  return (
    <Link href={`/social/events/${entity.id}`}>
      <div className="border rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
        {entity.coverImage && (
          <img
            src={entity.coverImage}
            alt=""
            className="w-full h-24 object-cover"
          />
        )}
        <div className="p-3 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium truncate">{entity.title}</p>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {t(eventTypeKeys[entity.eventType])}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {new Date(entity.startDate).toLocaleDateString("pl-PL", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {entity.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {entity.location}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function CropLogPreview({
  entity,
}: {
  entity: Extract<SharedEntityData, { type: "CROP_LOG" }>;
}) {
  const t = useTranslations("farming");

  return (
    <Link href={`/farming/logs`}>
      <div className="flex gap-3 border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        {entity.image && (
          <img
            src={entity.image}
            alt=""
            className="w-16 h-16 rounded-md object-cover shrink-0"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Leaf className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Badge variant="outline" className="text-[10px]">
              {t(cropLogTypeKeys[entity.logType])}
            </Badge>
          </div>
          <p className="text-sm line-clamp-2">{entity.description}</p>
          <p className="text-xs text-muted-foreground">{entity.farmerName}</p>
        </div>
      </div>
    </Link>
  );
}

function ProductPreview({
  entity,
}: {
  entity: Extract<SharedEntityData, { type: "PRODUCT" }>;
}) {
  const t = useTranslations("product");

  return (
    <Link href={entity.listingId ? `/marketplace/${entity.listingId}` : `/farmers/${entity.id}`}>
      <div className="flex gap-3 border rounded-lg p-3 bg-muted/30 hover:bg-muted/50 transition-colors">
        {entity.image && (
          <img
            src={entity.image}
            alt=""
            className="w-16 h-16 rounded-md object-cover shrink-0"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <ShoppingBasket className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-sm font-medium truncate">{entity.name}</p>
          </div>
          {entity.price && entity.unit && (
            <p className="text-sm text-primary font-medium">
              {entity.price} zł/{t(unitKeys[entity.unit])}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{entity.farmerName}</span>
            <Badge variant="outline" className="text-[10px]">
              {t(methodKeys[entity.method])}
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  );
}
