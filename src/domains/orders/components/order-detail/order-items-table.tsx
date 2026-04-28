"use client";

import { useTranslations } from "next-intl";
import type { OrderItem, Listing } from "@/shared/db/schema";

type OrderItemWithListing = OrderItem & { listing: Pick<Listing, "price"> };

interface OrderItemsTableProps {
  items: OrderItemWithListing[];
  showModified?: boolean;
}

export function OrderItemsTable({ items, showModified = false }: OrderItemsTableProps) {
  const t = useTranslations("orders");

  const indicativeTotal = items.reduce((sum, item) => {
    const qty = showModified && item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
    return sum + qty * Number(item.listing.price);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">{t("product")}</th>
              <th className="text-right py-2">{t("quantity")}</th>
              <th className="text-right py-2">{t("pricePerUnit")}</th>
              <th className="text-right py-2">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const qty = showModified && item.modifiedQuantity
                ? Number(item.modifiedQuantity)
                : Number(item.quantity);
              const unitPrice = Number(item.listing.price);

              return (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.productName}</td>
                  <td className="text-right py-2">
                    {showModified && item.modifiedQuantity ? (
                      <span>
                        <span className="line-through text-muted-foreground mr-1">{Number(item.quantity)}</span>
                        <span className="text-primary font-medium">{qty}</span>
                      </span>
                    ) : (
                      qty
                    )}{" "}
                    {item.unit.toLowerCase()}
                  </td>
                  <td className="text-right py-2">{unitPrice.toFixed(2)} zł</td>
                  <td className="text-right py-2 font-medium">{(qty * unitPrice).toFixed(2)} zł</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between font-semibold pt-1 border-t">
        <span>{t("indicativeValue")}</span>
        <span>{indicativeTotal.toFixed(2)} zł</span>
      </div>
      <p className="text-xs text-muted-foreground italic">{t("indicativeValueNote")}</p>
    </div>
  );
}
