import { useTranslations } from "next-intl";
import { CropLogCard } from "./crop-log-card";
import type { FarmerCropLog } from "../queries/get-crop-logs";

interface CropLogListProps {
  entries: FarmerCropLog[];
}

export function CropLogList({ entries }: CropLogListProps) {
  const t = useTranslations("farming");

  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t("noEntries")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <CropLogCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
