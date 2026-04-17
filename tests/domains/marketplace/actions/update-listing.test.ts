/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateListing } from "@/domains/marketplace/actions/update-listing";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
  const mockDb = {
    query: {
      listings: { findFirst: vi.fn() },
    },
    update: mockUpdate,
  };
  return { db: mockDb };
});

vi.mock("@/shared/lib/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
  STORAGE_BUCKET: "images",
}));

describe("updateListing", () => {
  const validInput = {
    name: "Pomidory malinowe",
    description: "Swiezo zebrane",
    categoryId: "cat-1",
    method: "ECO" as const,
    tags: ["eko"],
    images: ["https://example.com/img.jpg"],
    price: 12.5,
    unit: "KG" as const,
    quantityAvailable: 100,
    availability: "AVAILABLE" as const,
    deliveryOptions: [{ type: "PICKUP" as const, address: "ul. Polna 1" }],
  };

  const mockListing = {
    id: "list-1",
    productId: "prod-1",
    product: {
      id: "prod-1",
      farmerId: "user-1",
      images: ["https://example.com/img.jpg"],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns field errors for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await updateListing("list-1", { ...validInput, name: "", price: -1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toBeDefined();
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Oferta nie istnieje");
  });

  it("returns error when user is not the listing owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-2" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("updates product and listing and returns success", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(true);
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});
