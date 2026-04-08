import { describe, it, expect, vi, beforeEach } from "vitest";
import { cancelOrder } from "@/domains/orders/actions/cancel-order";

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
      orderItems: { findMany: vi.fn() },
      listings: { findFirst: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("cancelOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows customer to cancel PENDING order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "PENDING",
    } as any);
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => fn(db as any));

    const result = await cancelOrder({ orderId: "order-1", reason: "Zmiana planow" });
    expect(result.success).toBe(true);
  });

  it("prevents customer from cancelling CONFIRMED order without farmer role", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await cancelOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("zgody rolnika");
  });

  it("allows farmer to cancel at any stage with reason", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "PAID",
    } as any);
    vi.mocked(db.query.orderItems.findMany).mockResolvedValueOnce([]);
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => fn(db as any));

    const result = await cancelOrder({ orderId: "order-1", reason: "Brak towaru" });
    expect(result.success).toBe(true);
  });

  it("farmer must provide reason", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await cancelOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("powod");
  });

  it("cannot cancel COMPLETED order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "COMPLETED",
    } as any);

    const result = await cancelOrder({ orderId: "order-1", reason: "Test" });
    expect(result.success).toBe(false);
  });
});
