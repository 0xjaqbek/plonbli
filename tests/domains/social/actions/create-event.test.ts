import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEvent } from "@/domains/social/actions/create-event";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    query: {
      groupMembers: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createEvent({
      title: "Targ rolny",
      type: "MARKET",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes zalogowany");
    }
  });

  it("returns error for empty title", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createEvent({
      title: "",
      type: "MARKET",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });

    expect(result.success).toBe(false);
  });

  it("creates event on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "event-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await createEvent({
      title: "Targ rolny w Krakowie",
      type: "MARKET",
      location: "Plac Nowy, Krakow",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.eventId).toBe("event-1");
    }
  });
});
