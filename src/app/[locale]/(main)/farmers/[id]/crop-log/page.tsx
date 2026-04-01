import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getCropLogsByFarmer } from "@/domains/farming/queries/get-crop-logs";
import { CropLogList } from "@/domains/farming/components/crop-log-list";
import { CropLogForm } from "@/domains/farming/components/crop-log-form";

export default async function CropLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("farming");
  const session = await auth();
  const entries = await getCropLogsByFarmer(id);
  const isOwner = session?.user?.id === id;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("cropLog")}</h1>

      {isOwner && <CropLogForm />}

      <CropLogList entries={entries} />
    </div>
  );
}
