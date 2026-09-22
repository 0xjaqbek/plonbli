"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { createCampaignAction } from "../actions/create-campaign";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

export function CreateCampaignForm() {
  const t = useTranslations("crowdfunding");
  const [category, setCategory] = useState("FARMER_INVESTMENT");
  const [fundingModel, setFundingModel] = useState("ALL_OR_NOTHING");
  const [currencyMint, setCurrencyMint] = useState(
    "So11111111111111111111111111111111111111112"
  );

  const [state, formAction, pending] = useActionState(
    async (_prev: any, formData: FormData) => {
      return createCampaignAction(formData) as any;
    },
    null as { error?: Record<string, string[]> | string } | null
  );

  const fieldErrors =
    state?.error && typeof state.error !== "string" ? state.error : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {/* Intro */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <h2 className="font-medium mb-1">{t("form.introTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("form.introDescription")}
        </p>
      </div>

      {state?.error && typeof state.error === "string" && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">{t("form.title")}</Label>
        <Input id="title" name="title" required maxLength={200} />
        {fieldErrors?.title && (
          <p className="text-sm text-destructive">{fieldErrors.title}</p>
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
        {fieldErrors?.description && (
          <p className="text-sm text-destructive">
            {fieldErrors.description}
          </p>
        )}
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label htmlFor="images">{t("form.images")}</Label>
        <p className="text-xs text-muted-foreground">
          {t("form.imagesHint")}
        </p>
        <Input
          id="images"
          name="images"
          placeholder={t("form.imagePlaceholder")}
        />
        {fieldErrors?.images && (
          <p className="text-sm text-destructive">{fieldErrors.images}</p>
        )}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label>{t("form.category")}</Label>
        <input type="hidden" name="category" value={category} />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FARMER_INVESTMENT">
              {t("category.FARMER_INVESTMENT")}
            </SelectItem>
            <SelectItem value="GROUP_PRE_ORDER">
              {t("category.GROUP_PRE_ORDER")}
            </SelectItem>
            <SelectItem value="COMMUNITY_PROJECT">
              {t("category.COMMUNITY_PROJECT")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Funding Model */}
      <div className="space-y-2">
        <Label>{t("form.fundingModel")}</Label>
        <input type="hidden" name="fundingModel" value={fundingModel} />
        <Select value={fundingModel} onValueChange={setFundingModel}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL_OR_NOTHING">
              {t("form.allOrNothing")}
            </SelectItem>
            <SelectItem value="KEEP_WHAT_YOU_RAISE">
              {t("form.keepWhatYouRaise")}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t("form.fundingModelHint")}
        </p>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label>{t("form.currency")}</Label>
        <input type="hidden" name="currencyMint" value={currencyMint} />
        <Select value={currencyMint} onValueChange={setCurrencyMint}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="So11111111111111111111111111111111111111112">
              SOL
            </SelectItem>
            <SelectItem value="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v">
              USDC
            </SelectItem>
          </SelectContent>
        </Select>
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
        {fieldErrors?.goalAmount && (
          <p className="text-sm text-destructive">
            {fieldErrors.goalAmount}
          </p>
        )}
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label htmlFor="deadline">{t("form.deadline")}</Label>
        <Input
          id="deadline"
          name="deadline"
          type="datetime-local"
          required
          min={new Date().toISOString().slice(0, 16)}
        />
        {fieldErrors?.deadline && (
          <p className="text-sm text-destructive">{fieldErrors.deadline}</p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? t("form.creating") : t("form.create")}
      </Button>
    </form>
  );
}
