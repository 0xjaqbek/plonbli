import { describe, it, expect, vi, beforeEach } from "vitest";
import { addToCart } from "@/domains/orders/actions/add-to-cart";
import { updateCartItem } from "@/domains/orders/actions/update-cart-item";
import { removeFromCart } from "@/domains/orders/actions/remove-from-cart";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    update: vi.fn().mockReturnValue({ set: mockSet }),
    delete: vi.fn().mockReturnValue({ where: mockWhere }),
    query: {
      listings: { findFirst: vi.fn() },
      cartItems: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("addToCart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await addToCart({ listingId: "list-1", quantity: 2 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error for invalid quantity", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await addToCart({ listingId: "list-1", quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined);

    const result = await addToCart({ listingId: "list-1", quantity: 2 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Oferta nie istnieje");
  });

  it("adds item to cart on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "list-1",
      availability: "AVAILABLE",
    } as any);
    vi.mocked(db.query.cartItems.findFirst).mockResolvedValueOnce(undefined);
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "cart-1" }]);
    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({ returning: mockReturning }),
    } as any);

    const result = await addToCart({ listingId: "list-1", quantity: 2 });
    expect(result.success).toBe(true);
  });
});

describe("updateCartItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateCartItem("cart-1", 5);
    expect(result.success).toBe(false);
  });
});

describe("removeFromCart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await removeFromCart("cart-1");
    expect(result.success).toBe(false);
  });
});
