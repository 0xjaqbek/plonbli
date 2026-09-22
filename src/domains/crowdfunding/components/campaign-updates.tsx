"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Megaphone, Plus, Send } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { createUpdateAction } from "../actions/create-update";

type Update = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  authorName: string | null;
};

type Props = {
  campaignId: string;
  updates: Update[];
  isCreator: boolean;
};

export function CampaignUpdates({ campaignId, updates, isCreator }: Props) {
  const t = useTranslations("crowdfunding.updates");
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createUpdateAction(formData);
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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{t("title")}</h2>
        </div>
        {isCreator && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("addUpdate")}
          </Button>
        )}
      </div>

      {/* Post update form */}
      {isCreator && showForm && (
        <form action={handleSubmit} className="rounded-lg border p-4 space-y-3">
          <input type="hidden" name="campaignId" value={campaignId} />
          <div className="space-y-1.5">
            <Label htmlFor="update-title">{t("updateTitle")}</Label>
            <Input
              id="update-title"
              name="title"
              required
              maxLength={200}
              placeholder={t("titlePlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="update-content">{t("updateContent")}</Label>
            <Textarea
              id="update-content"
              name="content"
              required
              maxLength={5000}
              rows={4}
              placeholder={t("contentPlaceholder")}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              <Send className="mr-1.5 h-4 w-4" />
              {isPending ? t("posting") : t("post")}
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
      )}

      {/* Updates list */}
      {updates.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t("noUpdates")}</p>
      ) : (
        <div className="space-y-3">
          {updates.map((update) => (
            <div key={update.id} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-baseline justify-between">
                <h3 className="font-medium">{update.title}</h3>
                <time className="text-xs text-muted-foreground">
                  {new Date(update.createdAt).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {update.content}
              </p>
              {update.authorName && (
                <p className="text-xs text-muted-foreground">
                  — {update.authorName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
