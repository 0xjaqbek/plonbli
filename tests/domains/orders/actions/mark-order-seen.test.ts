import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("markOrderSeen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when order not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce(undefined);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when user is not participant", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
    } as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("returns success for customer participant", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
    } as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(true);
  });

  it("returns success for farmer participant", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
    } as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(true);
  });
});
