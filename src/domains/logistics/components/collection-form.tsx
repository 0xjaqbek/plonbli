"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { createCollection } from "../actions/create-collection";

interface CollectionFormProps {
  groupId: string;
  listingId?: string;
}

export function CollectionForm({ groupId, listingId }: CollectionFormProps) {
  const t = useTranslations("logistics");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [listing, setListing] = useState(listingId ?? "");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createCollection({
        groupId,
        listingId: listing.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        targetAmount: targetAmount.trim() || undefined,
        pickupAddress: pickupAddress.trim() || undefined,
        pickupDate: pickupDate || undefined,
      });

      if (result.success) {
        router.push(
          `/social/groups/${groupId}/collections/${result.collectionId}`
        );
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("collectionTitle")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="listingId">Listing ID</Label>
        <Input
          id="listingId"
          value={listing}
          onChange={(e) => setListing(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("collectionDescription")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="targetAmount">{t("targetAmount")}</Label>
        <Input
          id="targetAmount"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          placeholder="50.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pickupAddress">{t("pickupAddress")}</Label>
        <Input
          id="pickupAddress"
          value={pickupAddress}
          onChange={(e) => setPickupAddress(e.target.value)}
          maxLength={300}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pickupDate">{t("pickupDate")}</Label>
        <Input
          id="pickupDate"
          type="datetime-local"
          value={pickupDate}
          onChange={(e) => setPickupDate(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" isLoading={isPending} className="w-full">
        {t("createCollection")}
      </Button>
    </form>
  );
}
