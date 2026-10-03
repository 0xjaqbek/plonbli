"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { finalizeCampaignAction } from "../actions/finalize-campaign";
import { useFinalizeCampaignOnChain } from "../hooks/use-finalize-campaign-onchain";

export function FinalizeCampaignButton(props: {
  campaignId: string;
  campaignPubkey: string;
}) {
  const t = useTranslations("crowdfunding");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const { finalize, loading, error } = useFinalizeCampaignOnChain();

  function handleFinalize() {
    setMessage(null);
    if (!window.confirm(t("finalize.confirm"))) return;

    startTransition(async () => {
      const receipt = await finalize(props.campaignPubkey);
      if (!receipt) {
        setMessage(error ?? t("finalize.failed"));
        return;
      }
      const result = await finalizeCampaignAction(props.campaignId, receipt);
      setMessage(result.error ?? t("finalize.success"));
    });
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isPending || loading}
        onClick={handleFinalize}
      >
        {isPending || loading ? t("finalize.pending") : t("finalize.action")}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
