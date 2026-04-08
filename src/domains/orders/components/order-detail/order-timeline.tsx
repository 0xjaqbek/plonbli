// src/domains/orders/components/order-detail/order-timeline.tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, Clock } from "lucide-react";
import type { OrderStatusHistory } from "@/shared/db/schema";

interface OrderTimelineProps {
  history: OrderStatusHistory[];
}

export function OrderTimeline({ history }: OrderTimelineProps) {
  const t = useTranslations("orders");

  return (
    <div className="space-y-4">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        const statusKey = `status${entry.status.charAt(0) + entry.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1 ${isLast ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {isLast ? <Clock className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              </div>
              {i < history.length - 1 && <div className="w-px h-full bg-border" />}
            </div>
            <div className="pb-4">
              <p className="font-medium text-sm">{t(statusKey as any)}</p>
              {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
              <p className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString("pl")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
