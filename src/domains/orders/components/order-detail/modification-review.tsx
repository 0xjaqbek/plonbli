"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { AlertTriangle } from "lucide-react";
import { acceptModification } from "../../actions/accept-modification";
import { cancelOrder } from "../../actions/cancel-order";
import { OrderItemsTable } from "./order-items-table";
import type { OrderDetail } from "../../queries/get-order";

interface ModificationReviewProps {
  orderId: string;
  items: OrderDetail["items"];
  farmerNote: string | null;
}

export function ModificationReview({ orderId, items, farmerNote }: ModificationReviewProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptModification(orderId);
      if (result.success) router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId, reason: t("modificationRejected") });
      if (result.success) router.refresh();
    });
  }

  return (
    <Card className="border-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          {t("statusModified")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {farmerNote && (
          <p className="text-sm bg-muted p-3 rounded-lg">{t("farmerNote")}: {farmerNote}</p>
        )}
        <OrderItemsTable items={items} showModified />
      </CardContent>
      <CardFooter className="gap-3">
        <Button onClick={handleAccept} isLoading={isPending} className="flex-1">
          {t("acceptModification")}
        </Button>
        <Button variant="destructive" onClick={handleReject} isLoading={isPending} className="flex-1">
          {t("rejectModification")}
        </Button>
      </CardFooter>
    </Card>
  );
}
