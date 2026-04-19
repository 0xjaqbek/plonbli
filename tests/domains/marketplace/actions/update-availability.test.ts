/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateAvailability } from "@/domains/marketplace/actions/update-availability";

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

describe("updateAvailability", () => {
  const mockListing = {
    id: "list-1",
    product: { id: "prod-1", farmerId: "user-1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateAvailability("list-1", "AVAILABLE");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error for invalid availability value", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await updateAvailability("list-1", "INVALID");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await updateAvailability("list-1", "AVAILABLE");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Oferta nie istnieje");
  });

  it("returns error when user is not the listing owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-2" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateAvailability("list-1", "AVAILABLE");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("updates availability and returns success", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateAvailability("list-1", "SEASONAL");
    expect(result.success).toBe(true);
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
