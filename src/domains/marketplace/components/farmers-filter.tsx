"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { LocationCascade, type LocationValue } from "@/domains/geo";
import { Button } from "@/shared/ui/button";

export function FarmersFilter() {
  const t = useTranslations("marketplace");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  function handleLocationChange(loc: LocationValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (loc.voivodeship) {
      params.set("voivodeship", loc.voivodeship);
    } else {
      params.delete("voivodeship");
    }
    if (loc.county) {
      params.set("county", loc.county);
    } else {
      params.delete("county");
    }
    if (loc.commune) {
      params.set("commune", loc.commune);
    } else {
      params.delete("commune");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <LocationCascade
          mode="filter"
          value={{
            voivodeship: searchParams.get("voivodeship"),
            county: searchParams.get("county"),
            commune: searchParams.get("commune"),
          }}
          onChange={handleLocationChange}
        />
      </div>
      {searchParams.toString() && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
