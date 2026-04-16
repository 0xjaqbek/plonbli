import { Suspense } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { MapPin } from "lucide-react";
import { getFarmers } from "@/domains/marketplace/queries/get-farmers";
import { getFarmersForMap } from "@/domains/marketplace/queries/get-farmers-for-map";
import {
  getProxyFarmersForList,
  getProxyFarmersForMap,
} from "@/domains/marketplace/queries/get-proxy-farmer";
import { FarmersTabs } from "@/domains/marketplace/components/farmers-tabs";
import { FarmersFilter } from "@/domains/marketplace/components/farmers-filter";
import { geocodeFarmersWithoutCoords } from "@/domains/geo/actions/geocode-farmers";
import { searchFarmersSchema } from "@/domains/marketplace/schemas/validation";

export default async function FarmersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("farmer");
  const tProxy = await getTranslations("proxyFarmer");

  await geocodeFarmersWithoutCoords();

  const params = await searchParams;
  const parsed = searchFarmersSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : {};

  const [regularFarmers, proxyFarmers, farmersForMap, proxyForMap] =
    await Promise.all([
      getFarmers(filters),
      getProxyFarmersForList(),
      getFarmersForMap(),
      getProxyFarmersForMap(),
    ]);

  type FarmerItem = {
    id: string;
    name: string;
    avatar: string | null;
    voivodeship: string | null;
    createdAt: Date;
    isProxy: boolean;
  };

  const allFarmers: FarmerItem[] = [
    ...regularFarmers.map((f) => ({ ...f, isProxy: false })),
    ...proxyFarmers.map((f) => ({ ...f, isProxy: true })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const allForMap = [
    ...farmersForMap.map((f) => ({ ...f, isProxy: false })),
    ...proxyForMap,
  ];

  const listContent =
    allFarmers.length === 0 ? (
      <p className="text-center text-muted-foreground py-12">
        {t("noFarmers")}
      </p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {allFarmers.map((farmer) => (
          <Link
            key={`${farmer.isProxy ? "proxy-" : ""}${farmer.id}`}
            href={
              farmer.isProxy
                ? `/farmers/proxy/${farmer.id}`
                : `/farmers/${farmer.id}`
            }
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={farmer.avatar ?? undefined} />
                  <AvatarFallback>
                    {farmer.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium truncate">{farmer.name}</p>
                    {farmer.isProxy && (
                      <Badge
                        variant="outline"
                        className="text-[9px] shrink-0 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700"
                      >
                        {tProxy("ambassadorBadge")}
                      </Badge>
                    )}
                  </div>
                  {farmer.voivodeship && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {farmer.voivodeship}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-1 text-[10px]">
                    {t("memberSince")}{" "}
                    {new Date(farmer.createdAt).toLocaleDateString("pl-PL", {
                      month: "short",
                      year: "numeric",
                    })}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("allFarmers")}</h1>
      <Suspense>
        <FarmersFilter />
      </Suspense>
      <FarmersTabs farmers={allForMap} listContent={listContent} />
    </div>
  );
}
