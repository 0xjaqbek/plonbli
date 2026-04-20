"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { updateAvailability } from "../actions/update-availability";
import { useAnalytics, EVENTS } from "@/domains/analytics";

type Availability = "AVAILABLE" | "SEASONAL" | "OUT_OF_STOCK";

interface AvailabilitySelectProps {
  listingId: string;
  value: Availability;
}

export function AvailabilitySelect({ listingId, value }: AvailabilitySelectProps) {
  const t = useTranslations("product");
  const tMarketplace = useTranslations("marketplace");
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<Availability>(value);
  const { trackEvent } = useAnalytics();

  function handleChange(newValue: string) {
    const next = newValue as Availability;
    setCurrent(next);
    startTransition(async () => {
      const result = await updateAvailability(listingId, newValue);
      if (result.success) {
        trackEvent(EVENTS.LISTING_AVAILABILITY_UPDATED, {
          listingId,
          availability: next,
        });
      } else {
        setCurrent(value); // revert on error
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t("availabilityLabel")}:</span>
      <Select value={current} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AVAILABLE">{tMarketplace("available")}</SelectItem>
          <SelectItem value="SEASONAL">{tMarketplace("seasonal")}</SelectItem>
          <SelectItem value="OUT_OF_STOCK">{tMarketplace("outOfStock")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
