import { describe, it, expect } from "vitest";
import {
  addToCartSchema,
  createOrderSchema,
  modifyOrderSchema,
  submitPaymentProofSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  shippingInfoSchema,
  farmerPaymentMethodSchema,
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
  it("accepts item modifications", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
      items: [{ orderItemId: "item-1", modifiedQuantity: 3, modifiedPricePerUnit: 10 }],
      paymentRequired: "PREPAID",
    });
    expect(result.success).toBe(true);
  });

  it("accepts shipping cost change", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
      shippingCost: 15,
      paymentRequired: "ON_PICKUP",
    });
    expect(result.success).toBe(true);
  });

  it("requires paymentRequired", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("submitPaymentProofSchema", () => {
  it("accepts screenshot proof", () => {
    const result = submitPaymentProofSchema.safeParse({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts blockchain link proof", () => {
    const result = submitPaymentProofSchema.safeParse({
      orderId: "order-1",
      type: "BLOCKCHAIN_LINK",
      transactionUrl: "https://etherscan.io/tx/0x123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects screenshot without imageUrl", () => {
    const result = submitPaymentProofSchema.safeParse({
      orderId: "order-1",
      type: "SCREENSHOT",
    });
    expect(result.success).toBe(false);
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

describe("farmerPaymentMethodSchema", () => {
  it("accepts valid payment method", () => {
    const result = farmerPaymentMethodSchema.safeParse({
      type: "BLIK",
      label: "BLIK na telefon",
      details: "600 123 456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty details", () => {
    const result = farmerPaymentMethodSchema.safeParse({
      type: "TRANSFER",
      label: "Przelew",
      details: "",
    });
    expect(result.success).toBe(false);
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
