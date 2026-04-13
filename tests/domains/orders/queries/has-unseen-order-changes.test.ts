import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    select: vi.fn(),
  };
  return { db: mockDb };
});

describe("hasUnseenOrderChanges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when customer has unseen changes", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([{ id: "order-1" }]),
        }),
      }),
    } as any);

    const { hasUnseenOrderChanges } = await import(
      "@/domains/orders/queries/has-unseen-order-changes"
    );
    const result = await hasUnseenOrderChanges("user-1");
    expect(result).toBe(true);
  });

  it("returns false when no unseen changes", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValueOnce([]),
        }),
      }),
    } as any);

    const { hasUnseenOrderChanges } = await import(
      "@/domains/orders/queries/has-unseen-order-changes"
    );
    const result = await hasUnseenOrderChanges("user-1");
    expect(result).toBe(false);
  });
});
