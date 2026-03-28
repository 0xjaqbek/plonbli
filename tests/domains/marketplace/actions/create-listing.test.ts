/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createListing } from "@/domains/marketplace/actions/create-listing";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    query: {
      users: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("createListing", () => {
  const validInput = {
    name: "Pomidory malinowe",
    description: "Swiezo zebrane",
    categoryId: "cat-1",
    method: "ECO" as const,
    tags: ["eko"],
    images: [],
    price: 12.5,
    unit: "KG" as const,
    quantityAvailable: 100,
    availability: "AVAILABLE" as const,
    deliveryOptions: [
      { type: "PICKUP" as const, address: "ul. Polna 1" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createListing(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error when user is not a farmer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      role: "CONSUMER",
    } as any);

    const result = await createListing(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      role: "FARMER",
    } as any);

    const result = await createListing({
      ...validInput,
      name: "",
      price: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toBeDefined();
  });

  it("creates product and listing on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      role: "FARMER",
    } as any);

    const mockInsert = vi.mocked(db.insert);
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([{ id: "prod-1" }]),
      }),
    } as any);
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([{ id: "list-1" }]),
      }),
    } as any);

    const result = await createListing(validInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.listingId).toBe("list-1");
  });
});
