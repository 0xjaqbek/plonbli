"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { updateCampaignAction } from "@/domains/crowdfunding/actions/update-campaign";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { ArrowLeft } from "lucide-react";

type Campaign = {
  id: string;
  title: string;
  description: string;
  images: string[];
};

type ActionState = {
  error?: string | Record<string, string[] | undefined>;
  success?: boolean;
} | null;

export function EditCampaignForm({ campaign }: { campaign: Campaign }) {
  const t = useTranslations("crowdfunding");
  const router = useRouter();

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (_prev, formData) => {
      return updateCampaignAction(campaign.id, formData);
    },
    null
  );

  useEffect(() => {
    if (state?.success) {
      router.push(`/crowdfunding/${campaign.id}`);
    }
  }, [state?.success, campaign.id, router]);

  const fieldErrors =
    state?.error && typeof state.error !== "string" ? state.error : null;

  return (
    <>
      {/* Back navigation */}
      <Link
        href={`/crowdfunding/${campaign.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("edit.backToCampaign")}
      </Link>

      <form action={formAction} className="space-y-6 max-w-2xl">
        {state?.error && typeof state.error === "string" && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">{t("form.title")}</Label>
          <Input
            id="title"
            name="title"
            defaultValue={campaign.title}
            maxLength={200}
          />
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
            defaultValue={campaign.description}
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
            defaultValue={campaign.images.join(", ")}
            placeholder={t("form.imagePlaceholder")}
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? t("edit.saving") : t("edit.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/crowdfunding/${campaign.id}`)}
          >
            {t("manage.cancel")}
          </Button>
        </div>
      </form>
    </>
  );
}
