"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Plus } from "lucide-react";
import { addMilestoneAction } from "../actions/add-milestone";

type Props = {
  campaignId: string;
};

export function MilestoneForm({ campaignId }: Props) {
  const t = useTranslations("crowdfunding.manage");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addMilestoneAction(campaignId, formData);
      if (result.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : Object.values(result.error).flat().join(", ")
        );
      } else {
        setShowForm(false);
      }
    });
  }

  if (!showForm) {
    return (
      <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
        <Plus className="h-4 w-4 mr-1" />
        {t("addMilestone")}
      </Button>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div className="space-y-2">
        <Label htmlFor="ms-title">{t("milestoneTitle")}</Label>
        <Input id="ms-title" name="title" required maxLength={200} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ms-description">{t("milestoneDescription")}</Label>
        <Textarea
          id="ms-description"
          name="description"
          required
          rows={3}
          maxLength={5000}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ms-targetAmount">{t("milestoneTargetAmount")}</Label>
        <Input
          id="ms-targetAmount"
          name="targetAmount"
          type="number"
          step="0.01"
          min="0.01"
          required
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("adding") : t("add")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(false)}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
