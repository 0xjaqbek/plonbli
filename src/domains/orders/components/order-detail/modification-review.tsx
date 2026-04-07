// src/domains/orders/components/order-detail/modification-review.tsx
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
import type { OrderItem } from "@/shared/db/schema";

interface ModificationReviewProps {
  orderId: string;
  items: OrderItem[];
  originalTotal: string;
  newTotal: string;
  farmerNote: string | null;
}

export function ModificationReview({
  orderId, items, originalTotal, newTotal, farmerNote,
}: ModificationReviewProps) {
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
      const result = await cancelOrder({ orderId, reason: "Odrzucono modyfikacje" });
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
        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>{t("total")}</span>
          <span>
            {Number(originalTotal) !== Number(newTotal) && (
              <span className="line-through text-muted-foreground mr-2">
                {Number(originalTotal).toFixed(2)} zl
              </span>
            )}
            {Number(newTotal).toFixed(2)} zl
          </span>
        </div>
      </CardContent>
      <CardFooter className="gap-3">
        <Button onClick={handleAccept} disabled={isPending} className="flex-1">
          {t("acceptModification")}
        </Button>
        <Button variant="destructive" onClick={handleReject} disabled={isPending} className="flex-1">
          {t("rejectModification")}
        </Button>
      </CardFooter>
    </Card>
  );
}
