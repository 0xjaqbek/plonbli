import { describe, it, expect, vi, beforeEach } from "vitest";
import { modifyOrder } from "@/domains/orders/actions/modify-order";
import { acceptModification } from "@/domains/orders/actions/accept-modification";
import { confirmOrder } from "@/domains/orders/actions/confirm-order";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
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

describe("modifyOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await modifyOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
  });

  it("returns error when order not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce(undefined);

    const result = await modifyOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Zapytanie nie istnieje");
  });

  it("returns error when user is not the farmer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "PENDING",
    } as any);

    const result = await modifyOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("returns error when order is not in PENDING status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await modifyOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
  });
});

describe("confirmOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await confirmOrder("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when order not in PENDING status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "COMPLETED",
    } as any);

    const result = await confirmOrder("order-1");
    expect(result.success).toBe(false);
  });
});

describe("acceptModification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await acceptModification("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when order not in MODIFIED status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "PENDING",
    } as any);

    const result = await acceptModification("order-1");
    expect(result.success).toBe(false);
  });
});
