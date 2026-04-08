export type OrderStatus =
  | "PENDING"
  | "MODIFIED"
  | "CONFIRMED"
  | "PAID"
  | "PREPARING"
  | "SHIPPED"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type DeliveryMethod = "PICKUP" | "DELIVERY" | "DROP_POINT";

export type PaymentMethod = "BLIK" | "TRANSFER" | "CRYPTO" | "CASH_ON_PICKUP";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Zlożone",
  MODIFIED: "Zmodyfikowane",
  CONFIRMED: "Potwierdzone",
  PAID: "Oplacone",
  PREPARING: "W przygotowaniu",
  SHIPPED: "Wyslane",
  READY_FOR_PICKUP: "Gotowe do odbioru",
  COMPLETED: "Odebrane",
  CANCELLED: "Anulowane",
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: "Odbior osobisty",
  DELIVERY: "Wysylka",
  DROP_POINT: "Punkt odbioru",
};
