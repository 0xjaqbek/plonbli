// src/domains/orders/components/order-detail/order-detail.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { MessageCircle, Package, Truck, MapPin, ExternalLink } from "lucide-react";
import { OrderTimeline } from "./order-timeline";
import { OrderItemsTable } from "./order-items-table";
import { PaymentProofForm } from "./payment-proof-form";
import { ModificationReview } from "./modification-review";
import { completeOrder } from "../../actions/complete-order";
import { cancelOrder } from "../../actions/cancel-order";
import type { OrderDetail as OrderDetailType } from "../../queries/get-order";

interface OrderDetailProps {
  order: OrderDetailType;
  isCustomer: boolean;
}

export function OrderDetail({ order, isCustomer }: OrderDetailProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  function handleComplete() {
    startTransition(async () => {
      const result = await completeOrder(order.id);
      if (result.success) router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId: order.id, reason: cancelReason || undefined });
      if (result.success) router.refresh();
    });
  }

  const showPaymentForm = isCustomer && order.status === "CONFIRMED" && order.paymentRequired === "PREPAID";
  const showModificationReview = isCustomer && order.status === "MODIFIED";
  const canComplete = isCustomer && (order.status === "SHIPPED" || order.status === "READY_FOR_PICKUP");
  const canCancel = isCustomer && ["PENDING", "MODIFIED"].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("pl")}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {t(`status${order.status.charAt(0) + order.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as any)}
        </Badge>
      </div>

      {/* Modification review */}
      {showModificationReview && (
        <ModificationReview
          orderId={order.id}
          items={order.items}
          originalTotal={order.totalAmount}
          newTotal={order.totalAmount}
          farmerNote={order.farmerNote}
        />
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pozycje</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} showModified={order.status !== "PENDING"} />
          <Separator className="my-3" />
          {order.shippingCost && (
            <div className="flex justify-between text-sm">
              <span>{t("shippingCost")}</span>
              <span>{Number(order.shippingCost).toFixed(2)} zl</span>
            </div>
          )}
          <div className="flex justify-between font-semibold mt-2">
            <span>{t("total")}</span>
            <span>{Number(order.totalAmount).toFixed(2)} zl</span>
          </div>
        </CardContent>
      </Card>

      {/* Delivery info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {order.deliveryMethod === "DELIVERY" ? <Truck className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            {t("delivery")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>{t(`delivery${order.deliveryMethod.charAt(0) + order.deliveryMethod.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as any)}</p>
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

      {/* Payment section */}
      {showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentProof")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show farmer payment methods */}
            {order.farmerPaymentMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("paymentMethods")} rolnika:</p>
                {order.farmerPaymentMethods.map((method) => (
                  <div key={method.id} className="text-sm p-2 bg-muted rounded">
                    <span className="font-medium">{method.label}:</span> {method.details}
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <PaymentProofForm orderId={order.id} />
          </CardContent>
        </Card>
      )}

      {/* Payment proofs list */}
      {order.paymentProofs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentProof")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.paymentProofs.map((proof) => (
              <div key={proof.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Badge variant={proof.verified ? "default" : "outline"}>
                  {proof.verified ? t("paymentVerified") : t("paymentPending")}
                </Badge>
                <span className="text-sm">{proof.type}</span>
                {proof.transactionUrl && (
                  <a href={proof.transactionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                    Link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Historia</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline history={order.statusHistory} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {canComplete && (
          <Button onClick={handleComplete} disabled={isPending} className="flex-1">
            {t("completeOrder")}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.push(`/messages`)}
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
              <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                {t("cancel")}
              </Button>
              <Button variant="ghost" onClick={() => setShowCancel(false)}>
                {t("back" as any)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
