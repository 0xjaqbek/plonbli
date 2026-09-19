"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Target, Check } from "lucide-react";
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

type Props = {
  campaignId: string;
  rewardTiers: CrowdfundingRewardTier[];
};

export function ContributeDialog({ campaignId, rewardTiers }: Props) {
  const t = useTranslations("crowdfunding.backer");
  const tCommon = useTranslations("crowdfunding");
  const [open, setOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedTierData = rewardTiers.find((t) => t.id === selectedTier);
  const minAmount = selectedTierData
    ? parseFloat(selectedTierData.price)
    : 0.01;

  function handleTierSelect(tierId: string | null) {
    setSelectedTier(tierId);
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
    startTransition(async () => {
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
          setAmount("");
        }, 2000);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Target className="mr-2 h-5 w-5" />
          {tCommon("contribute")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("contributeTitle")}</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-lg font-medium">{t("thankYou")}</p>
            <p className="text-sm text-muted-foreground">{t("contributionRecorded")}</p>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-5">
            <input type="hidden" name="campaignId" value={campaignId} />
            {selectedTier && (
              <input type="hidden" name="rewardTierId" value={selectedTier} />
            )}

            {/* Reward tier selection */}
            {rewardTiers.length > 0 && (
              <div className="space-y-3">
                <Label>{t("selectTier")}</Label>

                {/* No reward option */}
                <button
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedTier === null
                      ? "border-primary bg-primary/5"
                      : "hover:border-muted-foreground/30"
                  }`}
                  onClick={() => handleTierSelect(null)}
                >
                  <p className="font-medium">{t("noReward")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("noRewardHint")}
                  </p>
                </button>

                {/* Tier options */}
                {rewardTiers.map((tier) => {
                  const isFull =
                    tier.maxBackers > 0 &&
                    tier.currentBackers >= tier.maxBackers;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      disabled={isFull}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        isFull
                          ? "opacity-50 cursor-not-allowed"
                          : selectedTier === tier.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-muted-foreground/30"
                      }`}
                      onClick={() => !isFull && handleTierSelect(tier.id)}
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

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("processing") : t("confirmContribution")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
