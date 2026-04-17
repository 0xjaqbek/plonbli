"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { deleteListing } from "../actions/delete-listing";

interface ListingCardActionsProps {
  listingId: string;
}

export function ListingCardActions({ listingId }: ListingCardActionsProps) {
  const t = useTranslations("common");
  const tProduct = useTranslations("product");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteListing(listingId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/marketplace/${listingId}/edit`}>{t("edit")}</Link>
      </Button>
      {!showConfirm ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirm(true)}
        >
          {t("delete")}
        </Button>
      ) : (
        <>
          <span className="text-xs text-destructive">
            {tProduct("confirmDelete")}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            {t("delete")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(false)}
          >
            {t("cancel")}
          </Button>
        </>
      )}
    </div>
  );
}
