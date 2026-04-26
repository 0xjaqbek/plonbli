"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Trash2, Minus, Plus } from "lucide-react";
import { updateCartItem } from "../../actions/update-cart-item";
import { removeFromCart } from "../../actions/remove-from-cart";
import { useAnalytics, EVENTS } from "@/domains/analytics";

interface CartItemRowProps {
  cartItemId: string;
  listingId: string;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
  image?: string;
  onUpdate: () => void;
}

export function CartItemRow({
  cartItemId, listingId, productName, quantity, price, unit, image, onUpdate,
}: CartItemRowProps) {
  const t = useTranslations("orders");
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(quantity);
  const { trackEvent } = useAnalytics();

  function handleQuantityChange(newQty: number) {
    if (newQty <= 0) return;
    setQty(newQty);
    startTransition(async () => {
      await updateCartItem(cartItemId, newQty);
      onUpdate();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromCart(cartItemId);
      trackEvent(EVENTS.CART_ITEM_REMOVED, { listingId });
      onUpdate();
    });
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b">
      {image ? (
        <img src={image} alt={productName} className="w-16 h-16 rounded object-cover" />
      ) : (
        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-2xl">🌱</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{productName}</p>
        <p className="text-sm text-muted-foreground">
          {price.toFixed(2)} zl / {unit.toLowerCase()}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(qty - 1)}
          isLoading={isPending} disabled={qty <= 1}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={qty}
          onChange={(e) => handleQuantityChange(Number(e.target.value))}
          className="w-16 h-8 text-center"
          min={1}
          disabled={isPending}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(qty + 1)}
          isLoading={isPending}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="w-20 text-right font-medium">
        {(qty * price).toFixed(2)} zl
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        onClick={handleRemove}
        isLoading={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
