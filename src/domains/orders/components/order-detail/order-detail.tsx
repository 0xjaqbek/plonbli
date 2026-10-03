"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { MessageCircle, Package, Truck, MapPin, ExternalLink } from "lucide-react";
import { OrderTimeline } from "./order-timeline";
import { OrderItemsTable } from "./order-items-table";
import { ModificationReview } from "./modification-review";
import { completeOrder } from "../../actions/complete-order";
import { cancelOrder } from "../../actions/cancel-order";
import { createConversation } from "@/domains/messaging";
import type { OrderDetail as OrderDetailType } from "../../queries/get-order";
import { useBadges } from "@/shared/lib/badge-context";
import {
  DELIVERY_METHOD_TRANSLATION_KEYS,
  ORDER_STATUS_TRANSLATION_KEYS,
} from "../../lib/translation-keys";

interface OrderDetailProps {
  order: OrderDetailType;
  isCustomer: boolean;
}

export function OrderDetail({ order, isCustomer }: OrderDetailProps) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { clearUnseenOrders } = useBadges();

  useEffect(() => {
    clearUnseenOrders();
  }, []);

  function handleComplete() {
    startTransition(async () => {
      const result = await completeOrder(order.id);
      if (result.success) router.refresh();
    });
  }

  function handleMessageAboutOrder() {
    const otherPartyId = isCustomer ? order.farmer.id : order.customer.id;
    startTransition(async () => {
      const result = await createConversation({
        type: "DIRECT",
        participantIds: [otherPartyId],
        orderId: order.id,
      });
      if (result.success) {
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId: order.id, reason: cancelReason || undefined });
      if (result.success) router.refresh();
    });
  }

  const showModificationReview = isCustomer && order.status === "MODIFIED";
  const canComplete = isCustomer && (order.status === "SHIPPED" || order.status === "READY_FOR_PICKUP");
  const canCancel = isCustomer && ["PENDING", "MODIFIED"].includes(order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("pl")}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {t(ORDER_STATUS_TRANSLATION_KEYS[order.status])}
        </Badge>
      </div>

      {showModificationReview && (
        <ModificationReview
          orderId={order.id}
          items={order.items}
          farmerNote={order.farmerNote}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} showModified={order.status !== "PENDING"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {order.deliveryMethod === "DELIVERY" ? <Truck className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            {t("delivery")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>{t(DELIVERY_METHOD_TRANSLATION_KEYS[order.deliveryMethod])}</p>
          {order.deliveryAddress && <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>}
          {order.trackingNumber && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="text-sm">{t("trackingNumber")}: {order.trackingNumber}</span>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline history={order.statusHistory} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {canComplete && (
          <Button onClick={handleComplete} isLoading={isPending} className="flex-1">
            {t("completeOrder")}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleMessageAboutOrder}
          isLoading={isPending}
          className="flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          {t("messageToFarmer")}
        </Button>
        {canCancel && (
          <Button variant="destructive" onClick={() => setShowCancel(true)} disabled={isPending}>
            {t("cancel")}
          </Button>
        )}
      </div>

      {showCancel && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <textarea
              className="w-full border rounded p-2 text-sm"
              placeholder={t("cancelReason")}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleCancel} isLoading={isPending}>
                {t("cancel")}
              </Button>
              <Button variant="ghost" onClick={() => setShowCancel(false)}>
                {tCommon("back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
