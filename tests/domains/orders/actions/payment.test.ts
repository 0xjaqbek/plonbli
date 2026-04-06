import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitPaymentProof } from "@/domains/orders/actions/submit-payment-proof";
import { verifyPayment } from "@/domains/orders/actions/verify-payment";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn() }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
      paymentProofs: { findFirst: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("submitPaymentProof", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await submitPaymentProof({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(false);
  });

  it("returns error when order not in CONFIRMED status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "PENDING",
    } as any);

    const result = await submitPaymentProof({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(false);
  });

  it("returns error when not the customer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "CONFIRMED",
    } as any);

    const result = await submitPaymentProof({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(false);
  });
});

describe("verifyPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not the farmer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await verifyPayment("order-1", "proof-1");
    expect(result.success).toBe(false);
  });
});
