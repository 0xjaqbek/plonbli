"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { Target, Check, Wallet } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import type { CrowdfundingRewardTier } from "@/shared/db/schema/crowdfunding-reward-tiers";
import { contributeAction } from "../actions/contribute";
import { useContributeOnChain } from "../hooks/use-contribute-onchain";

type Props = {
  campaignId: string;
  campaignPubkey: string | null;
  currencyMint: string;
  rewardTiers: CrowdfundingRewardTier[];
};

export function ContributeDialog({
  campaignId,
  campaignPubkey,
  currencyMint,
  rewardTiers,
}: Props) {
  const t = useTranslations("crowdfunding.backer");
  const tCommon = useTranslations("crowdfunding");
  const wallet = useAnchorWallet();
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState<number | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    contribute: contributeOnChain,
    loading: onChainLoading,
    error: onChainError,
  } = useContributeOnChain();

  const selectedTierData = rewardTiers.find((t) => t.id === selectedTier);
  const minAmount = selectedTierData
    ? parseFloat(selectedTierData.price)
    : 0.01;

  function handleTierSelect(tierId: string | null, tierIndex: number | null) {
    setSelectedTier(tierId);
    setSelectedTierIndex(tierIndex);
    if (tierId) {
      const tier = rewardTiers.find((t) => t.id === tierId);
      if (tier) setAmount(tier.price);
    } else {
      setAmount("");
    }
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);

    if (!wallet) {
      setError(tCommon("errors.WALLET_NOT_CONNECTED"));
      return;
    }

    if (!campaignPubkey) {
      setError(t("onChainFailed"));
      return;
    }

    startTransition(async () => {
      // On-chain contribution is mandatory — wallet required
      const onChainResult = await contributeOnChain({
        campaignPubkey,
        amount: parseFloat(amount),
        rewardTier: selectedTierIndex,
        currencyMint,
      });

      if (!onChainResult) {
        setError(onChainError || t("onChainFailed"));
        return;
      }

      // Record in DB with on-chain reference
      formData.set("contributionPubkey", onChainResult.contributionPubkey);
      formData.set("transactionSignature", onChainResult.signature);
      const result = await contributeAction(formData);
      if (result.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : Object.values(result.error).flat().join(", ")
        );
      } else {
        setSuccess(true);
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          setSelectedTier(null);
          setSelectedTierIndex(null);
          setAmount("");
        }, 2000);
      }
    });
  }

  const isProcessing = isPending || onChainLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Target className="mr-2 h-5 w-5" />
          {tCommon("contribute")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("contributeTitle")}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium">{t("thankYou")}</p>
            <p className="text-sm text-muted-foreground">
              {t("contributionRecorded")}
            </p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-5">
            <input type="hidden" name="campaignId" value={campaignId} />
            {selectedTier && (
              <input type="hidden" name="rewardTierId" value={selectedTier} />
            )}

            {/* Wallet status */}
            <div
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${
                wallet
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              <Wallet className="h-3.5 w-3.5" />
              {wallet ? t("walletConnected") : t("walletRequired")}
            </div>

            {/* Reward tier selection */}
            {rewardTiers.length > 0 && (
              <div className="space-y-3">
                <Label>{t("selectTier")}</Label>

                <button
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedTier === null
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/30"
                  }`}
                  onClick={() => handleTierSelect(null, null)}
                >
                  <p className="font-medium">{t("noReward")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("noRewardHint")}
                  </p>
                </button>

                {rewardTiers.map((tier, idx) => {
                  const isFull =
                    tier.maxBackers > 0 &&
                    tier.currentBackers >= tier.maxBackers;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={isFull}
                      aria-disabled={isFull ? "true" : undefined}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isFull
                          ? "opacity-50 cursor-not-allowed"
                          : selectedTier === tier.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground/30"
                      }`}
                      onClick={() => !isFull && handleTierSelect(tier.id, idx)}
                    >
                      <div className="flex items-baseline justify-between">
                        <p className="font-medium">{tier.title}</p>
                        <p className="text-lg font-bold text-primary">
                          {parseFloat(tier.price).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {tier.description}
                      </p>
                      {tier.maxBackers > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {isFull
                            ? t("tierFull")
                            : t("tierRemaining", {
                                remaining:
                                  tier.maxBackers - tier.currentBackers,
                              })}
                        </p>
                      )}
                      {isFull && (
                        <p className="sr-only">{t("tierFullDescription")}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="contrib-amount">{t("amount")}</Label>
              <Input
                id="contrib-amount"
                name="amount"
                type="number"
                step="0.01"
                min={minAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder={t("amountPlaceholder")}
              />
              {selectedTierData && (
                <p className="text-xs text-muted-foreground">
                  {t("minAmount", { min: selectedTierData.price })}
                </p>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={isProcessing || !wallet}>
              {!wallet
                ? t("walletRequired")
                : isProcessing
                  ? onChainLoading
                    ? t("signingTransaction")
                    : t("processing")
                  : t("confirmContribution")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
