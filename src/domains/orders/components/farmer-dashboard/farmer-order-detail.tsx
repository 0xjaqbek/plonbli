"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Check, Package, Truck, User } from "lucide-react";
import { OrderTimeline } from "../order-detail/order-timeline";
import { OrderItemsTable } from "../order-detail/order-items-table";
import { confirmOrder } from "../../actions/confirm-order";
import { verifyPayment } from "../../actions/verify-payment";
import { updateOrderStatus, markAsShipped } from "../../actions/update-order-status";
import { cancelOrder } from "../../actions/cancel-order";
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
  const { clearUnseenOrders } = useBadges();

  useEffect(() => {
    clearUnseenOrders();
  }, []);

  const PROOF_TYPE_LABELS: Record<string, string> = {
    SCREENSHOT: t("proofScreenshot"),
    BANK_TRANSFER: t("proofBankTransfer"),
    BLOCKCHAIN_LINK: t("proofBlockchain"),
  };

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t("statusPending"),
    MODIFIED: t("statusModified"),
    CONFIRMED: t("statusConfirmed"),
    PAID: t("statusPaid"),
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

  function handleVerifyPayment(proofId: string) {
    startTransition(async () => {
      const result = await verifyPayment(order.id, proofId);
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

  const canConfirm = order.status === "PENDING";
  const canModify = order.status === "PENDING";
  const canVerifyPayment = order.status === "CONFIRMED" && order.paymentProofs.some((p) => !p.verified);
  const canPrepare = order.status === "PAID" || (order.status === "CONFIRMED" && order.paymentRequired === "ON_PICKUP");
  const canShip = order.status === "PREPARING" && order.deliveryMethod === "DELIVERY";
  const canMarkReady = (order.status === "PREPARING" || order.status === "PAID" || (order.status === "CONFIRMED" && order.paymentRequired === "ON_PICKUP")) && order.deliveryMethod === "PICKUP";

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
          <Separator className="my-3" />
          <div className="flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>{Number(order.totalAmount).toFixed(2)} zl</span>
          </div>
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
                <p className="text-xs text-muted-foreground italic">{t("modifyFormPlaceholder")}</p>
                <Button variant="ghost" onClick={() => setShowModify(false)}>{tCommon("cancel")}</Button>
              </CardContent>
            </Card>
          )}

          {canVerifyPayment && (
            <div className="space-y-3">
              <p className="font-medium">{t("paymentProof")}</p>
              {order.paymentProofs.filter((p) => !p.verified).map((proof) => (
                <div key={proof.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Badge variant="outline">{PROOF_TYPE_LABELS[proof.type] ?? proof.type}</Badge>
                    {proof.imageUrl && <img src={proof.imageUrl} alt="Proof" className="mt-2 max-w-xs rounded" />}
                    {proof.transactionUrl && (
                      <a href={proof.transactionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary block mt-1">
                        {proof.transactionUrl}
                      </a>
                    )}
                  </div>
                  <Button onClick={() => handleVerifyPayment(proof.id)} isLoading={isPending} size="sm">
                    {t("verifyPayment")}
                  </Button>
                </div>
              ))}
            </div>
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
