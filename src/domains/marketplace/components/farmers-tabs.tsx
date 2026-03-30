"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { FarmerMap } from "./farmer-map";
import type { FarmerForMap } from "../queries/get-farmers-for-map";

interface FarmersTabsProps {
  farmers: FarmerForMap[];
  listContent: React.ReactNode;
}

export function FarmersTabs({ farmers, listContent }: FarmersTabsProps) {
  const t = useTranslations("farmer");

  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list">{t("listView")}</TabsTrigger>
        <TabsTrigger value="map">{t("mapView")}</TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-4">
        {listContent}
      </TabsContent>

      <TabsContent value="map" className="mt-4">
        <FarmerMap farmers={farmers} />
      </TabsContent>
    </Tabs>
  );
}
