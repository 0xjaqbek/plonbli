import { describe, it, expect, vi, beforeEach } from "vitest";
import { rsvpEvent } from "@/domains/social/actions/rsvp-event";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn(),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
    query: {
      eventRsvps: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("rsvpEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await rsvpEvent({
      eventId: "event-1",
      status: "GOING",
    });

    expect(result.success).toBe(false);
  });

  it("sets RSVP when no existing RSVP", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.eventRsvps.findFirst).mockResolvedValueOnce(undefined);

    const mockValues = vi.fn().mockResolvedValueOnce(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await rsvpEvent({
      eventId: "event-1",
      status: "GOING",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.status).toBe("GOING");
    }
  });

  it("removes RSVP when same status clicked", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.eventRsvps.findFirst).mockResolvedValueOnce({
      eventId: "event-1",
      userId: "user-1",
      status: "GOING",
      createdAt: new Date(),
    });

    vi.mocked(db.delete).mockReturnValueOnce({
      where: vi.fn().mockResolvedValueOnce(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await rsvpEvent({
      eventId: "event-1",
      status: "GOING",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.status).toBeNull();
    }
  });
});
