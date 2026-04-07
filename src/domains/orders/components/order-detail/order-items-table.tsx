// src/domains/orders/components/order-detail/order-items-table.tsx
"use client";

import { useTranslations } from "next-intl";
import type { OrderItem } from "@/shared/db/schema";

interface OrderItemsTableProps {
  items: OrderItem[];
  showModified?: boolean;
}

export function OrderItemsTable({ items, showModified = false }: OrderItemsTableProps) {
  const t = useTranslations("orders");

  return (
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
            const hasModification = showModified && (item.modifiedQuantity || item.modifiedPricePerUnit);
            const qty = hasModification && item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
            const price = hasModification && item.modifiedPricePerUnit ? Number(item.modifiedPricePerUnit) : Number(item.pricePerUnit);

            return (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.productName}</td>
                <td className="text-right py-2">
                  {hasModification && item.modifiedQuantity ? (
                    <span>
                      <span className="line-through text-muted-foreground mr-1">{Number(item.quantity)}</span>
                      <span className="text-primary font-medium">{qty}</span>
                    </span>
                  ) : (
                    qty
                  )}{" "}
                  {item.unit.toLowerCase()}
                </td>
                <td className="text-right py-2">
                  {hasModification && item.modifiedPricePerUnit ? (
                    <span>
                      <span className="line-through text-muted-foreground mr-1">{Number(item.pricePerUnit).toFixed(2)}</span>
                      <span className="text-primary font-medium">{price.toFixed(2)}</span>
                    </span>
                  ) : (
                    price.toFixed(2)
                  )}{" "}
                  zl
                </td>
                <td className="text-right py-2 font-medium">{(qty * price).toFixed(2)} zl</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
