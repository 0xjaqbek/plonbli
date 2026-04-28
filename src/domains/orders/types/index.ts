export type OrderStatus =
  | "PENDING"
  | "MODIFIED"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type DeliveryMethod = "PICKUP" | "DELIVERY" | "DROP_POINT";

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: "Odbior osobisty",
  DELIVERY: "Wysylka",
  DROP_POINT: "Punkt odbioru",
};
