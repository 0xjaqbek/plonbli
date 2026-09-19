"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createCampaignAction } from "../actions/create-campaign";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";

export function CreateCampaignForm() {
  const t = useTranslations("crowdfunding");
  const [state, formAction, pending] = useActionState(
    async (_prev: any, formData: FormData) => {
      return createCampaignAction(formData);
    },
    null
  );

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t("form.title")}</Label>
        <Input id="title" name="title" required maxLength={200} />
        {state?.error?.title && (
          <p className="text-sm text-destructive">{state.error.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">{t("form.description")}</Label>
        <Textarea
          id="description"
          name="description"
          required
          rows={6}
          maxLength={10000}
        />
        {state?.error?.description && (
          <p className="text-sm text-destructive">{state.error.description}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">{t("form.category")}</Label>
        <select
          id="category"
          name="category"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="FARMER_INVESTMENT">
            {t("category.FARMER_INVESTMENT")}
          </option>
          <option value="GROUP_PRE_ORDER">
            {t("category.GROUP_PRE_ORDER")}
          </option>
          <option value="COMMUNITY_PROJECT">
            {t("category.COMMUNITY_PROJECT")}
          </option>
        </select>
      </div>

      {/* Funding Model */}
      <div className="space-y-2">
        <Label htmlFor="fundingModel">{t("form.fundingModel")}</Label>
        <select
          id="fundingModel"
          name="fundingModel"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="ALL_OR_NOTHING">
            {t("form.allOrNothing")}
          </option>
          <option value="KEEP_WHAT_YOU_RAISE">
            {t("form.keepWhatYouRaise")}
          </option>
        </select>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label htmlFor="currencyMint">{t("form.currency")}</Label>
        <select
          id="currencyMint"
          name="currencyMint"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="So11111111111111111111111111111111111111112">
            SOL
          </option>
          <option value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
            USDC
          </option>
        </select>
      </div>

      {/* Goal Amount */}
      <div className="space-y-2">
        <Label htmlFor="goalAmount">{t("form.goalAmount")}</Label>
        <Input
          id="goalAmount"
          name="goalAmount"
          type="number"
          step="0.01"
          min="0.01"
          required
        />
        {state?.error?.goalAmount && (
          <p className="text-sm text-destructive">{state.error.goalAmount}</p>
        )}
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label htmlFor="deadline">{t("form.deadline")}</Label>
        <Input id="deadline" name="deadline" type="datetime-local" required />
        {state?.error?.deadline && (
          <p className="text-sm text-destructive">{state.error.deadline}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("form.creating") : t("form.create")}
      </Button>
    </form>
  );
}
