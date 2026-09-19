import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { CampaignDetail } from "@/domains/crowdfunding/components/campaign-detail";

export default async function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("crowdfunding");

  const campaign = await getCampaignById(id);
  if (!campaign) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <CampaignDetail campaign={campaign} />
    </div>
  );
}
