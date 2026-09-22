"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function EditCampaignError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("crowdfunding");

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t("error.title")}</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          {t("error.description")}
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>{t("error.retry")}</Button>
          <Button variant="outline" asChild>
            <Link href="/crowdfunding">{t("error.backToList")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
