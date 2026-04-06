import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOrderStatus } from "@/domains/orders/actions/update-order-status";
import { completeOrder } from "@/domains/orders/actions/complete-order";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn() }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn() }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("updateOrderStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateOrderStatus({
      orderId: "order-1",
      status: "PREPARING",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status transition", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "PENDING",
    } as any);

    const result = await updateOrderStatus({
      orderId: "order-1",
      status: "PREPARING",
    });
    expect(result.success).toBe(false);
  });
});

describe("completeOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not the customer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "SHIPPED",
    } as any);

    const result = await completeOrder("order-1");
    expect(result.success).toBe(false);
  });
});
