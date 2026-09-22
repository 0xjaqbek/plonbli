import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getCampaignById } from "@/domains/crowdfunding/queries/get-campaigns";
import { EditCampaignForm } from "./edit-campaign-form";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  const { id } = await params;
  const t = await getTranslations("crowdfunding");

  const campaign = await getCampaignById(id);
  if (!campaign) {
    notFound();
  }

  // Only the creator can edit
  if (campaign.creatorId !== session.user.id) {
    redirect(`/crowdfunding/${id}`);
  }

  // Only SETUP campaigns can be edited
  if (campaign.status !== "SETUP") {
    redirect(`/crowdfunding/${id}`);
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">{t("edit.title")}</h1>
      <EditCampaignForm campaign={campaign} />
    </div>
  );
}
