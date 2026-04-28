"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { ShoppingCart, User } from "lucide-react";
import { CartItemRow } from "./cart-item-row";
import type { CartGroup } from "../../queries/get-cart";

interface CartViewProps {
  groups: CartGroup[];
}

export function CartView({ groups }: CartViewProps) {
  const t = useTranslations("orders");
  const router = useRouter();

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("emptyCart")}</p>
      </div>
    );
  }

  function handleUpdate() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.farmer.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {group.farmer.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {group.items.map((item) => (
              <CartItemRow
                key={item.cartItem.id}
                cartItemId={item.cartItem.id}
                listingId={item.listing.id}
                productName={item.product.name}
                quantity={Number(item.cartItem.quantity)}
                price={Number(item.listing.price)}
                unit={item.listing.unit}
                image={item.product.images[0]}
                onUpdate={handleUpdate}
              />
            ))}
          </CardContent>
          <CardFooter className="flex justify-between items-end">
            <div>
              <p className="font-semibold text-sm">{t("indicativeValue")}: {group.total.toFixed(2)} zł</p>
              <p className="text-xs text-muted-foreground">{t("indicativeValueNote")}</p>
            </div>
            <Button onClick={() => router.push(`/marketplace/cart/${group.farmer.id}/checkout`)}>
              {t("checkout")}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
