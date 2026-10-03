import type { Order } from "@/shared/db/schema";

export const ORDER_STATUS_TRANSLATION_KEYS = {
  PENDING: "statusPending",
  MODIFIED: "statusModified",
  CONFIRMED: "statusConfirmed",
  PAID: "statusConfirmed",
  PREPARING: "statusPreparing",
  SHIPPED: "statusShipped",
  READY_FOR_PICKUP: "statusReadyForPickup",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
} as const satisfies Record<Order["status"], string>;

export const DELIVERY_METHOD_TRANSLATION_KEYS = {
  PICKUP: "deliveryPickup",
  DELIVERY: "deliveryDelivery",
  DROP_POINT: "deliveryDropPoint",
} as const satisfies Record<Order["deliveryMethod"], string>;
