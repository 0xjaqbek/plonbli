"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { updateCollectionStatus } from "@/domains/logistics/actions/update-collection-status";

interface StatusUpdateButtonProps {
  collectionId: string;
  currentStatus: string;
}

const statusFlow: Record<string, string> = {
  COLLECTING: "ORDERED",
  ORDERED: "IN_DELIVERY",
  IN_DELIVERY: "RECEIVED",
};

const statusKeys: Record<string, string> = {
  ORDERED: "statusOrdered",
  IN_DELIVERY: "statusInDelivery",
  RECEIVED: "statusReceived",
  CANCELLED: "statusCancelled",
};

export function StatusUpdateButton({
  collectionId,
  currentStatus,
}: StatusUpdateButtonProps) {
  const t = useTranslations("logistics");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const nextStatus = statusFlow[currentStatus];

  async function handleStatusChange(status: string) {
    startTransition(async () => {
      await updateCollectionStatus({
        collectionId,
        status: status as "COLLECTING" | "ORDERED" | "IN_DELIVERY" | "RECEIVED" | "CANCELLED",
      });
      router.refresh();
    });
  }

  if (currentStatus === "RECEIVED" || currentStatus === "CANCELLED") {
    return null;
  }

  return (
    <div className="flex gap-2">
      {nextStatus && (
        <Button
          onClick={() => handleStatusChange(nextStatus)}
          isLoading={isPending}
        >
          {t(statusKeys[nextStatus])}
        </Button>
      )}
      <Button
        variant="destructive"
        onClick={() => handleStatusChange("CANCELLED")}
        isLoading={isPending}
      >
        {t("statusCancelled")}
      </Button>
    </div>
  );
}
