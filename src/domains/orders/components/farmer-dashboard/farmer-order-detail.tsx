"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Check, Package, Truck, User } from "lucide-react";
import { OrderTimeline } from "../order-detail/order-timeline";
import { OrderItemsTable } from "../order-detail/order-items-table";
import { confirmOrder } from "../../actions/confirm-order";
import { updateOrderStatus, markAsShipped } from "../../actions/update-order-status";
import { cancelOrder } from "../../actions/cancel-order";
import { modifyOrder } from "../../actions/modify-order";
import type { OrderDetail } from "../../queries/get-order";
import { useBadges } from "@/shared/lib/badge-context";

interface FarmerOrderDetailProps {
  order: OrderDetail;
}

export function FarmerOrderDetail({ order }: FarmerOrderDetailProps) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showModify, setShowModify] = useState(false);
  const [modifiedQuantities, setModifiedQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      order.items.map((item) => [
        item.id,
        item.modifiedQuantity !== null && item.modifiedQuantity !== undefined
          ? String(Number(item.modifiedQuantity))
          : String(Number(item.quantity)),
      ])
    )
  );
  const [farmerNote, setFarmerNote] = useState(order.farmerNote ?? "");
  const { clearUnseenOrders } = useBadges();

  useEffect(() => {
    clearUnseenOrders();
  }, []);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t("statusPending"),
    MODIFIED: t("statusModified"),
    CONFIRMED: t("statusConfirmed"),
    PREPARING: t("statusPreparing"),
    SHIPPED: t("statusShipped"),
    READY_FOR_PICKUP: t("statusReadyForPickup"),
    COMPLETED: t("statusCompleted"),
    CANCELLED: t("statusCancelled"),
  };

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmOrder(order.id);
      if (result.success) router.refresh();
    });
  }

  function handleStatusChange(status: "PREPARING" | "READY_FOR_PICKUP") {
    startTransition(async () => {
      const result = await updateOrderStatus({ orderId: order.id, status });
      if (result.success) router.refresh();
    });
  }

  function handleShip() {
    startTransition(async () => {
      const result = await markAsShipped({
        orderId: order.id,
        trackingNumber,
        trackingUrl: trackingUrl || undefined,
      });
      if (result.success) router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId: order.id, reason: cancelReason });
      if (result.success) router.refresh();
    });
  }

  function handleModifySave() {
    startTransition(async () => {
      const items = order.items.map((item) => ({
        orderItemId: item.id,
        modifiedQuantity: modifiedQuantities[item.id] !== undefined
          ? Number(modifiedQuantities[item.id])
          : undefined,
      }));
      const result = await modifyOrder({
        orderId: order.id,
        items,
        farmerNote: farmerNote || undefined,
      });
      if (result.success) {
        setShowModify(false);
        router.refresh();
      }
    });
  }

  const canConfirm = order.status === "PENDING";
  const canModify = order.status === "PENDING";
  const canPrepare = order.status === "CONFIRMED";
  const canShip = order.status === "PREPARING" && order.deliveryMethod === "DELIVERY";
  const canMarkReady = order.status === "PREPARING" && order.deliveryMethod !== "DELIVERY";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> {order.customer.name}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      {order.customerNote && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{t("customerNote")}: {order.customerNote}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("items")}</CardTitle></CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} showModified={order.status !== "PENDING"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("actions")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canConfirm && (
            <div className="flex flex-col gap-2">
              <Button onClick={handleConfirm} isLoading={isPending}>
                <Check className="h-4 w-4 mr-2" />
                {t("confirm")}
              </Button>
              <Button variant="outline" onClick={() => setShowModify(true)} disabled={isPending}>
                {t("modify")}
              </Button>
            </div>
          )}

          {showModify && canModify && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">{t("modifyHint")}</p>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <span className="flex-1 text-sm">{item.productName}</span>
                      <span className="text-xs text-muted-foreground w-16 text-right">
                        {t("quantity")}: {Number(item.quantity)} {item.unit.toLowerCase()}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-28"
                        value={modifiedQuantities[item.id] ?? ""}
                        onChange={(e) =>
                          setModifiedQuantities((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                      />
                      <span className="text-xs text-muted-foreground w-10">{item.unit.toLowerCase()}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label>{t("farmerNote")}</Label>
                  <textarea
                    className="w-full border rounded p-2 text-sm"
                    rows={2}
                    value={farmerNote}
                    onChange={(e) => setFarmerNote(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleModifySave} isLoading={isPending}>
                    {tCommon("save")}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowModify(false)} disabled={isPending}>
                    {tCommon("cancel")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {canPrepare && (
            <Button onClick={() => handleStatusChange("PREPARING")} isLoading={isPending}>
              <Package className="h-4 w-4 mr-2" />
              {t("markPreparing")}
            </Button>
          )}

          {canMarkReady && (
            <Button onClick={() => handleStatusChange("READY_FOR_PICKUP")} isLoading={isPending}>
              <Check className="h-4 w-4 mr-2" />
              {t("markReady")}
            </Button>
          )}

          {canShip && (
            <div className="space-y-3">
              <Label>{t("trackingNumber")}</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="PL123456789" />
              <Label>{t("trackingUrl")}</Label>
              <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." />
              <Button onClick={handleShip} isLoading={isPending} disabled={!trackingNumber}>
                <Truck className="h-4 w-4 mr-2" />
                {t("markShipped")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
        <CardContent>
          <OrderTimeline history={order.statusHistory} />
        </CardContent>
      </Card>

      {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
        <div>
          {!showCancel ? (
            <Button variant="destructive" onClick={() => setShowCancel(true)}>{t("cancel")}</Button>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Label>{t("cancelReason")}</Label>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleCancel} isLoading={isPending} disabled={!cancelReason}>
                    {t("cancel")}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCancel(false)}>{tCommon("cancel")}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
