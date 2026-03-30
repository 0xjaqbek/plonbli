import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { or, eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { MapPin } from "lucide-react";
import { getFarmersForMap } from "@/domains/marketplace/queries/get-farmers-for-map";
import { FarmersTabs } from "@/domains/marketplace/components/farmers-tabs";
import { geocodeFarmersWithoutCoords } from "@/domains/geo/actions/geocode-farmers";

export default async function FarmersPage() {
  const t = await getTranslations("farmer");

  // Geocode farmers without coords (lazy, one-time per farmer)
  await geocodeFarmersWithoutCoords();

  const [farmers, farmersForMap] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        voivodeship: users.voivodeship,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(or(eq(users.role, "FARMER"), eq(users.role, "BOTH")))
      .orderBy(desc(users.createdAt)),
    getFarmersForMap(),
  ]);

  const listContent =
    farmers.length === 0 ? (
      <p className="text-center text-muted-foreground py-12">
        {t("noFarmers")}
      </p>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {farmers.map((farmer) => (
          <Link key={farmer.id} href={`/farmers/${farmer.id}`}>
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {farmer.name?.charAt(0) ?? "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium truncate">{farmer.name}</p>
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
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("allFarmers")}</h1>
      <FarmersTabs farmers={farmersForMap} listContent={listContent} />
    </div>
  );
}
