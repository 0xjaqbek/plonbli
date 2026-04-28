"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { LocationCascade, type LocationValue } from "@/domains/geo";
import type { Category } from "@/shared/db/schema";
import { useAnalytics, EVENTS } from "@/domains/analytics";

interface SearchFiltersProps {
  categories: Category[];
}

type FilterType = "category" | "method" | "sort" | "location";

export function SearchFilters({ categories }: SearchFiltersProps) {
  const t = useTranslations("marketplace");
  const tProduct = useTranslations("product");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { trackEvent } = useAnalytics();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
      if (key !== "q" && value && value !== "all") {
        trackEvent(EVENTS.FILTER_APPLIED, {
          filterType: key as FilterType,
          value,
        });
      }
    },
    [searchParams, pathname, router, trackEvent]
  );

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q") as string;
    updateParams("q", query);
    trackEvent(EVENTS.SEARCH_PERFORMED, { query });
  }

  function clearFilters() {
    router.push(pathname);
  }

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
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    const locationValue = loc.commune ?? loc.county ?? loc.voivodeship;
    if (locationValue) {
      trackEvent(EVENTS.FILTER_APPLIED, {
        filterType: "location",
        value: locationValue,
      });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          name="q"
          placeholder={t("search")}
          defaultValue={searchParams.get("q") ?? ""}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          {t("filters")}
        </Button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Select
          value={searchParams.get("category") ?? "all"}
          onValueChange={(v) => updateParams("category", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <LocationCascade
          mode="filter"
          value={{
            voivodeship: searchParams.get("voivodeship"),
            county: searchParams.get("county"),
            commune: searchParams.get("commune"),
          }}
          onChange={handleLocationChange}
        />

        <Select
          value={searchParams.get("method") ?? "all"}
          onValueChange={(v) => updateParams("method", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={tProduct("method")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tProduct("method")}</SelectItem>
            <SelectItem value="ECO">{tProduct("methodEco")}</SelectItem>
            <SelectItem value="CONVENTIONAL">
              {tProduct("methodConventional")}
            </SelectItem>
            <SelectItem value="OTHER">{tProduct("methodOther")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("sort") ?? "newest"}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
            <SelectItem value="name">{t("sortName")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {searchParams.toString() && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
