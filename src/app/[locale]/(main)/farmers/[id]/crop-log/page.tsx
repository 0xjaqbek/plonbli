import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getCropLogsByFarmer } from "@/domains/farming/queries/get-crop-logs";
import { getCropLogComments } from "@/domains/farming/queries/get-crop-log-comments";
import { CropLogList } from "@/domains/farming/components/crop-log-list";
import { CropLogForm } from "@/domains/farming/components/crop-log-form";
import { SolanaWalletProvider } from "@/domains/crowdfunding/components/solana-wallet-provider";
import { WalletButton } from "@/domains/crowdfunding/components/wallet-button";
import { db } from "@/shared/db";
import { crowdfundingCampaigns } from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export default async function CropLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("farming");
  const session = await auth();
  const entries = await getCropLogsByFarmer(id);
  const comments = await getCropLogComments(entries.map((entry) => entry.id));
  const isOwner = session?.user?.id === id;
  const campaigns = isOwner
    ? await db
        .select({
          id: crowdfundingCampaigns.id,
          title: crowdfundingCampaigns.title,
          campaignPubkey: crowdfundingCampaigns.campaignPubkey,
        })
        .from(crowdfundingCampaigns)
        .where(eq(crowdfundingCampaigns.creatorId, id))
    : [];

  return (
    <SolanaWalletProvider>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{t("cropLog")}</h1>
          {isOwner && <WalletButton />}
        </div>

        {isOwner && <CropLogForm campaigns={campaigns} />}

        <CropLogList
          entries={entries}
          comments={comments}
          canComment={!!session?.user?.id}
        />
      </div>
    </SolanaWalletProvider>
  );
}
