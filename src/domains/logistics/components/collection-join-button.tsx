"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { joinCollection } from "../actions/join-collection";

interface CollectionJoinButtonProps {
  collectionId: string;
}

export function CollectionJoinButton({
  collectionId,
}: CollectionJoinButtonProps) {
  const t = useTranslations("logistics");
  const tc = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await joinCollection({
        collectionId,
        quantity: quantity.trim(),
        note: note.trim() || undefined,
      });

      if (result.success) {
        setShowForm(false);
        router.refresh();
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="w-full">
        {t("joinCollection")}
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="quantity">{t("quantity")}</Label>
        <Input
          id="quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="5.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="note">{t("note")}</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} className="flex-1">
          {t("joinCollection")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowForm(false)}
        >
          {tc("cancel")}
        </Button>
      </div>
    </form>
  );
}
