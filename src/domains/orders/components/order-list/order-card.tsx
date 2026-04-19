// src/domains/orders/components/order-list/order-card.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { User } from "lucide-react";
import type { OrderStatus } from "../../types";

interface OrderCardProps {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: Date;
  counterpartyName: string | null;
  counterpartyAvatar: string | null;
  href: string;
  hasUnseenChanges?: boolean;
}

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  MODIFIED: "secondary",
  CONFIRMED: "default",
  PAID: "default",
  PREPARING: "default",
  SHIPPED: "default",
  READY_FOR_PICKUP: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function OrderCard({
  orderNumber, status, totalAmount, createdAt, counterpartyName, href, hasUnseenChanges,
}: OrderCardProps) {
  const t = useTranslations("orders");

  const statusLabel = t(`status${status.charAt(0) + status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as any);

  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{orderNumber}</p>
              {hasUnseenChanges && (
                <span className="h-2 w-2 rounded-full bg-destructive flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {counterpartyName}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{Number(totalAmount).toFixed(2)} zl</p>
            <p className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString("pl")}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[status]}>{statusLabel}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
