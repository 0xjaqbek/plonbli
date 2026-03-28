import { useTranslations } from "next-intl";
import { Truck, MapPin, Package } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import type { DeliveryOption } from "@/shared/db/schema";

interface DeliveryOptionsDisplayProps {
  options: DeliveryOption[];
}

const typeIcons: Record<string, typeof Truck> = {
  PICKUP: MapPin,
  DELIVERY: Truck,
  DROP_POINT: Package,
};

const typeKeys: Record<string, string> = {
  PICKUP: "deliveryPickup",
  DELIVERY: "deliveryDelivery",
  DROP_POINT: "deliveryDropPoint",
};

export function DeliveryOptionsDisplay({ options }: DeliveryOptionsDisplayProps) {
  const t = useTranslations("logistics");

  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noDeliveryOptions")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((option, idx) => {
        const Icon = typeIcons[option.type] ?? Package;
        return (
          <div key={idx} className="flex items-start gap-3 text-sm">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div className="space-y-1">
              <Badge variant="outline">{t(typeKeys[option.type])}</Badge>
              {option.address && (
                <p className="text-muted-foreground">{option.address}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {option.hours && (
                  <span>{t("deliveryHours")}: {option.hours}</span>
                )}
                {option.radius != null && (
                  <span>{t("deliveryRadius")}: {option.radius} km</span>
                )}
                {option.cost != null && (
                  <span>{t("deliveryCost")}: {option.cost} zl</span>
                )}
                {option.minAmount != null && (
                  <span>{t("deliveryMinAmount")}: {option.minAmount} zl</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
