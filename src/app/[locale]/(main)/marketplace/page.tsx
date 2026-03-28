import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getListings } from "@/domains/marketplace/queries/get-listings";
import { getCategories } from "@/domains/marketplace/queries/get-categories";
import { searchListingsSchema } from "@/domains/marketplace/schemas/validation";
import { ListingCard } from "@/domains/marketplace/components/listing-card";
import { SearchFilters } from "@/domains/marketplace/components/search-filters";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("marketplace");
  const params = await searchParams;

  const parsed = searchListingsSchema.safeParse(params);
  const filters = parsed.success
    ? parsed.data
    : { sort: "newest" as const, page: 1 };

  const [{ results, page, totalPages }, allCategories] =
    await Promise.all([getListings(filters), getCategories()]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/marketplace/create">
            <Plus className="h-4 w-4 mr-2" />
            {t("createListing")}
          </Link>
        </Button>
      </div>

      <Suspense>
        <SearchFilters categories={allCategories} />
      </Suspense>

      {results.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {t("noResults")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((item) => (
              <ListingCard key={item.listing.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`/marketplace?${new URLSearchParams({
                        ...Object.fromEntries(
                          Object.entries(params).filter(
                            ([, v]) => typeof v === "string"
                          ) as [string, string][]
                        ),
                        page: String(p),
                      }).toString()}`}
                    >
                      {p}
                    </Link>
                  </Button>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
