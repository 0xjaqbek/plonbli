import { describe, it, expect } from "vitest";
import {
  addToCartSchema,
  createOrderSchema,
  modifyOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  shippingInfoSchema,
  pickupSlotSchema,
} from "@/domains/orders/schemas/validation";

describe("addToCartSchema", () => {
  it("accepts valid input", () => {
    const result = addToCartSchema.safeParse({ listingId: "abc123", quantity: 5 });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = addToCartSchema.safeParse({ listingId: "abc123", quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects missing listingId", () => {
    const result = addToCartSchema.safeParse({ quantity: 5 });
    expect(result.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("accepts pickup order", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts delivery order with address", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "DELIVERY",
      deliveryAddress: "ul. Polna 1, Warszawa",
    });
    expect(result.success).toBe(true);
  });

  it("rejects delivery without address", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "DELIVERY",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional customerNote", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
      customerNote: "Prosze o wieksze pomidory",
    });
    expect(result.success).toBe(true);
  });
});

describe("modifyOrderSchema", () => {
  it("accepts quantity modifications", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
      items: [{ orderItemId: "item-1", modifiedQuantity: 3 }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts farmer note only", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
      farmerNote: "Mam tylko 2 kg jablek",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal input with just orderId", () => {
    const result = modifyOrderSchema.safeParse({ orderId: "order-1" });
    expect(result.success).toBe(true);
  });
});

describe("cancelOrderSchema", () => {
  it("accepts cancellation with reason", () => {
    const result = cancelOrderSchema.safeParse({
      orderId: "order-1",
      reason: "Zmiana planow",
    });
    expect(result.success).toBe(true);
  });

  it("accepts cancellation without reason", () => {
    const result = cancelOrderSchema.safeParse({ orderId: "order-1" });
    expect(result.success).toBe(true);
  });
});

describe("shippingInfoSchema", () => {
  it("accepts tracking number with url", () => {
    const result = shippingInfoSchema.safeParse({
      orderId: "order-1",
      trackingNumber: "PL123456789",
      trackingUrl: "https://tracking.poczta-polska.pl/PL123456789",
    });
    expect(result.success).toBe(true);
  });

  it("requires tracking number", () => {
    const result = shippingInfoSchema.safeParse({ orderId: "order-1" });
    expect(result.success).toBe(false);
  });

  it("trackingUrl is optional", () => {
    const result = shippingInfoSchema.safeParse({
      orderId: "order-1",
      trackingNumber: "PL123456789",
    });
    expect(result.success).toBe(true);
  });
});

describe("pickupSlotSchema", () => {
  it("accepts global weekly slot", () => {
    const result = pickupSlotSchema.safeParse({
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts specific date slot", () => {
    const result = pickupSlotSchema.safeParse({
      specificDate: "2026-04-10",
      startTime: "10:00",
      endTime: "12:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects dayOfWeek out of range", () => {
    const result = pickupSlotSchema.safeParse({
      dayOfWeek: 7,
      startTime: "14:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(false);
  });
});
