import { describe, it, expect, vi, beforeEach } from "vitest";
import { toggleReaction } from "@/domains/social/actions/toggle-reaction";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn(),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
    query: {
      reactions: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("toggleReaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await toggleReaction("post-1");

    expect(result.success).toBe(false);
  });

  it("adds reaction when not liked", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.reactions.findFirst).mockResolvedValueOnce(undefined);

    const mockValues = vi.fn().mockResolvedValueOnce(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await toggleReaction("post-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.liked).toBe(true);
    }
  });

  it("removes reaction when already liked", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.reactions.findFirst).mockResolvedValueOnce({
      postId: "post-1",
      userId: "user-1",
      createdAt: new Date(),
    });

    vi.mocked(db.delete).mockReturnValueOnce({
      where: vi.fn().mockResolvedValueOnce(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await toggleReaction("post-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.liked).toBe(false);
    }
  });
});
