"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { MapPin, Truck, Package } from "lucide-react";
import { createOrder } from "../../actions/create-order";
import { trackEvent, EVENTS } from "@/domains/analytics";
import type { CartGroup } from "../../queries/get-cart";
import type { PickupSlot } from "@/shared/db/schema";

interface CheckoutFormProps {
  cartGroup: CartGroup;
  farmerId: string;
  pickupSlots: PickupSlot[];
  availableDeliveryMethods: string[];
}

const DAY_NAMES = ["Niedziela", "Poniedzialek", "Wtorek", "Sroda", "Czwartek", "Piatek", "Sobota"];

export function CheckoutForm({ cartGroup, farmerId, pickupSlots, availableDeliveryMethods }: CheckoutFormProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState(availableDeliveryMethods[0] ?? "PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupSlotId, setPickupSlotId] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createOrder({
        farmerId,
        deliveryMethod: deliveryMethod as "PICKUP" | "DELIVERY" | "DROP_POINT",
        deliveryAddress: deliveryMethod === "DELIVERY" ? deliveryAddress : undefined,
        pickupSlotId: deliveryMethod === "PICKUP" && pickupSlotId ? pickupSlotId : undefined,
        customerNote: customerNote || undefined,
      });
      if (result.success) {
        trackEvent(EVENTS.ORDER_PLACED, {
          orderId: result.orderId,
          farmerId,
          itemCount: cartGroup.items.length,
          totalValue: cartGroup.total,
        });
        router.push(`/orders/${result.orderId}`);
      } else {
        setError(result.error ?? "Wystapil blad");
      }
    });
  }

  const deliveryIcons = { PICKUP: MapPin, DELIVERY: Truck, DROP_POINT: Package };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("subtotal")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {cartGroup.items.map((item) => (
            <div key={item.cartItem.id} className="flex justify-between text-sm">
              <span>{item.product.name} x {Number(item.cartItem.quantity)} {item.listing.unit.toLowerCase()}</span>
              <span>{(Number(item.cartItem.quantity) * Number(item.listing.price)).toFixed(2)} zl</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>{cartGroup.total.toFixed(2)} zl</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("delivery")}</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {availableDeliveryMethods.map((method) => {
              const Icon = deliveryIcons[method as keyof typeof deliveryIcons] ?? Package;
              const labelKey = method === "PICKUP" ? "deliveryPickup" : method === "DELIVERY" ? "deliveryShipping" : "deliveryDropPoint";
              return (
                <label
                  key={method}
                  htmlFor={`method-${method}`}
                  className="flex items-center space-x-3 p-3 rounded-lg border mb-2 cursor-pointer"
                >
                  <input
                    type="radio"
                    id={`method-${method}`}
                    name="deliveryMethod"
                    value={method}
                    checked={deliveryMethod === method}
                    onChange={() => setDeliveryMethod(method)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {t(labelKey)}
                  </span>
                </label>
              );
            })}
          </div>
          {deliveryMethod === "DELIVERY" && (
            <div className="mt-4">
              <Label htmlFor="address">{t("deliveryAddress")}</Label>
              <Input id="address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="ul. Polna 1, 00-001 Warszawa" />
            </div>
          )}
          {deliveryMethod === "PICKUP" && pickupSlots.length > 0 && (
            <div className="mt-4">
              <Label>{t("pickupSlot")}</Label>
              <Select value={pickupSlotId} onValueChange={setPickupSlotId}>
                <SelectTrigger><SelectValue placeholder={t("chooseSlot")} /></SelectTrigger>
                <SelectContent>
                  {pickupSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.dayOfWeek !== null ? `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}-${slot.endTime}` : `${slot.specificDate} ${slot.startTime}-${slot.endTime}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="note">{t("customerNote")}</Label>
          <Textarea id="note" value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} rows={3} maxLength={2000} />
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={isPending}>
        {isPending ? "..." : t("placeOrder")}
      </Button>
    </div>
  );
}
