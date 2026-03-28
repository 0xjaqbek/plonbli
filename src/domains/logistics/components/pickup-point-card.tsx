import { useTranslations } from "next-intl";
import { MapPin, Clock } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { PickupPointWithCreator } from "../queries/get-pickup-points";

interface PickupPointCardProps {
  point: PickupPointWithCreator;
}

export function PickupPointCard({ point }: PickupPointCardProps) {
  const t = useTranslations("logistics");

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{point.name}</CardTitle>
          <Badge variant={point.isActive ? "default" : "secondary"}>
            {point.isActive ? t("active") : t("inactive")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {point.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {point.description}
          </p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{point.address}</span>
        </div>

        {point.hours && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{point.hours}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {point.creator.name}
        </p>
      </CardContent>
    </Card>
  );
}
