import { getTranslations } from "next-intl/server";
import { CreateCampaignForm } from "@/domains/crowdfunding/components/create-campaign-form";

export default async function CreateCampaignPage() {
  const t = await getTranslations("crowdfunding");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{t("createCampaign")}</h1>
      <CreateCampaignForm />
    </div>
  );
}
