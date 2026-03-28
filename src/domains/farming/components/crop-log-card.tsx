import { useTranslations } from "next-intl";
import { Sprout, ShieldCheck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { FarmerCropLog } from "../queries/get-crop-logs";

interface CropLogCardProps {
  entry: FarmerCropLog;
}

const typeKeys: Record<string, string> = {
  PLANTING: "typePlanting",
  GROWING: "typeGrowing",
  TREATMENT: "typeTreatment",
  HARVEST: "typeHarvest",
  OTHER: "typeOther",
};

export function CropLogCard({ entry }: CropLogCardProps) {
  const t = useTranslations("farming");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm">{t(typeKeys[entry.type])}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {entry.product?.name && (
              <Badge variant="outline" className="text-[10px]">
                {entry.product.name}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] gap-1">
              <ShieldCheck className="h-3 w-3" />
              {entry.contentHash.slice(0, 8)}...
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm whitespace-pre-wrap">{entry.description}</p>

        {entry.data && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {entry.data.crop && (
              <span>
                {t("crop")}: {entry.data.crop}
              </span>
            )}
            {entry.data.area && (
              <span>
                {t("area")}: {entry.data.area}
              </span>
            )}
            {entry.data.quantity && (
              <span>
                {t("quantity")}: {entry.data.quantity}
              </span>
            )}
            {entry.data.method && (
              <span>
                {t("method")}: {entry.data.method}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {new Date(entry.createdAt).toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </CardContent>
    </Card>
  );
}
