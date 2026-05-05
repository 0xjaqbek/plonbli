"use client";

import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import type { FarmerForMap } from "../queries/get-farmers-for-map";

const FarmerMap = dynamic(() => import("./farmer-map").then((m) => m.FarmerMap), { ssr: false });

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
