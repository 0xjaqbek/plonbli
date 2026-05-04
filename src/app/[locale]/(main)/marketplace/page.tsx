import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getListings } from "@/domains/marketplace/queries/get-listings";
import { getCategories } from "@/domains/marketplace/queries/get-categories";
import { getProxyListingsForMarket } from "@/domains/marketplace/queries/get-proxy-listings";
import { searchListingsSchema } from "@/domains/marketplace/schemas/validation";
import { ListingCard } from "@/domains/marketplace/components/listing-card";
import { ProxyListingCard } from "@/domains/marketplace/components/proxy-listing-card";
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

  const isMine = params.mine === "1";
  const session = isMine ? await auth() : null;
  const userId = isMine ? session?.user?.id : undefined;
  const proxyPage = Number(params.proxyPage ?? 1) || 1;

  const emptyProxy = { results: [], total: 0, totalPages: 0, page: 1 };
  const [{ results, page, totalPages }, allCategories, proxyData] =
    await Promise.all([
      getListings(filters, userId),
      getCategories(),
      isMine ? Promise.resolve(emptyProxy) : getProxyListingsForMarket(proxyPage),
    ]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              <ListingCard key={item.listing.id} item={item} showActions={isMine} />
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

      {proxyData.results.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <div>
            <h2 className="text-xl font-semibold">{t("proxySection")}</h2>
            <p className="text-sm text-muted-foreground">{t("proxySectionDesc")}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {proxyData.results.map((item, i) => (
              <ProxyListingCard key={`${item.proxyFarmerId}-${i}`} item={item} />
            ))}
          </div>

          {proxyData.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: proxyData.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Button
                    key={p}
                    variant={p === proxyData.page ? "default" : "outline"}
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
                        proxyPage: String(p),
                      }).toString()}`}
                    >
                      {p}
                    </Link>
                  </Button>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
