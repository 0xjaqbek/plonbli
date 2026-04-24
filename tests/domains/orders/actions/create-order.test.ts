import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder } from "@/domains/orders/actions/create-order";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn(),
          }),
        }),
      }),
    }),
    query: {
      cartItems: { findMany: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("createOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error when cart is empty", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      }),
    } as any);

    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Koszyk jest pusty");
  });

  it("returns error for delivery without address", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "DELIVERY",
    });
    expect(result.success).toBe(false);
  });

  it("sends push to farmer after creating order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Klient Jan" },
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                cartItem: { id: "ci-1", quantity: "2" },
                listing: { id: "listing-1", price: "10", unit: "KG", deliveryOptions: [] },
                product: { farmerId: "farmer-1", name: "Ziemniaki" },
              },
            ]),
          }),
        }),
      }),
    } as any);

    vi.mocked(db.transaction).mockImplementationOnce(async (cb) =>
      cb({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any)
    );

    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
    });

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "farmer-1",
      expect.objectContaining({ category: "marketplace", url: expect.stringContaining("/farmer/orders/") })
    );
  });
});
