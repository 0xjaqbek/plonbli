// src/domains/orders/components/order-list/order-list.tsx
"use client";

import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { OrderCard } from "./order-card";
import type { OrderStatus } from "../../types";

interface OrderListItem {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: string;
    createdAt: Date;
  };
  counterparty: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface OrderListProps {
  orders: OrderListItem[];
  basePath: string; // "/orders" for customer, "/farmer/orders" for farmer
}

export function OrderList({ orders, basePath }: OrderListProps) {
  const t = useTranslations("orders");

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("noOrders")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(({ order, counterparty }) => (
        <OrderCard
          key={order.id}
          orderId={order.id}
          orderNumber={order.orderNumber}
          status={order.status}
          totalAmount={order.totalAmount}
          createdAt={order.createdAt}
          counterpartyName={counterparty.name}
          counterpartyAvatar={counterparty.avatar}
          href={`${basePath}/${order.id}`}
        />
      ))}
    </div>
  );
}
