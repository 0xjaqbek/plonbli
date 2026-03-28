/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteListing } from "@/domains/marketplace/actions/delete-listing";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    query: {
      listings: { findFirst: vi.fn() },
    },
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
  };
  return { db: mockDb };
});

describe("deleteListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await deleteListing("listing-1");
    expect(result.success).toBe(false);
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined);

    const result = await deleteListing("nonexistent");
    expect(result.success).toBe(false);
  });

  it("returns error when user is not the owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "listing-1",
      product: { farmerId: "user-2" },
    } as any);

    const result = await deleteListing("listing-1");
    expect(result.success).toBe(false);
  });

  it("deletes listing and product when user is owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "listing-1",
      productId: "prod-1",
      product: { farmerId: "user-1" },
    } as any);

    const mockWhere = vi.fn();
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

    const result = await deleteListing("listing-1");
    expect(result.success).toBe(true);
    expect(db.delete).toHaveBeenCalled();
  });
});
