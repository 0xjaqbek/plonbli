"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordMilestoneStatusAction } from "../actions/record-milestone-status";
import { useMilestoneOnChain } from "../hooks/use-milestone-onchain";
import { Button } from "@/shared/ui/button";

type Props = {
  milestoneId: string;
  milestonePubkey: string;
  milestoneIndex: number;
  campaignPubkey: string;
  currencyMint: string;
  status: "PENDING" | "APPROVED" | "RELEASED";
  campaignStatus: string;
  isCreator: boolean;
};

export function MilestoneOnChainControls(props: Props) {
  const t = useTranslations("crowdfunding");
  const router = useRouter();
  const { approve, release, loading, error: walletError, isPlatformAdmin } =
    useMilestoneOnChain();
  const [error, setError] = useState<string | null>(null);

  async function handleApprove() {
    setError(null);
    const receipt = await approve({
      campaignPubkey: props.campaignPubkey,
      milestonePubkey: props.milestonePubkey,
    });
    if (!receipt) return;
    const result = await recordMilestoneStatusAction(
      props.milestoneId,
      "APPROVED",
      receipt
    );
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function handleRelease() {
    setError(null);
    if (!window.confirm(t("milestones.releaseConfirm"))) return;
    const receipt = await release({
      campaignPubkey: props.campaignPubkey,
      milestonePubkey: props.milestonePubkey,
      milestoneIndex: props.milestoneIndex,
      currencyMint: props.currencyMint,
    });
    if (!receipt) return;
    const result = await recordMilestoneStatusAction(
      props.milestoneId,
      "RELEASED",
      receipt
    );
    if (result.error) setError(result.error);
    else router.refresh();
  }

  const showApprove = props.status === "PENDING" && isPlatformAdmin;
  const showRelease =
    props.status === "APPROVED" &&
    props.campaignStatus === "SUCCESSFUL" &&
    props.isCreator;

  if (!showApprove && !showRelease && !error && !walletError) return null;

  return (
    <div className="mt-2 space-y-1">
      {showApprove && (
        <Button size="sm" variant="outline" disabled={loading} onClick={handleApprove}>
          {loading ? t("milestones.processing") : t("milestones.approve")}
        </Button>
      )}
      {showRelease && (
        <Button size="sm" disabled={loading} onClick={handleRelease}>
          {loading ? t("milestones.processing") : t("milestones.release")}
        </Button>
      )}
      {(error || walletError) && (
        <p className="text-xs text-destructive">{error ?? walletError}</p>
      )}
    </div>
  );
}
