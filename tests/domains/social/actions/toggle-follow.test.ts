import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    query: {
      follows: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("toggleFollow", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-2");
    expect(result.success).toBe(false);
  });

  it("returns error when trying to follow self", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-1");
    expect(result.success).toBe(false);
  });

  it("sends push notification when following", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Anna Nowak" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.follows.findFirst).mockResolvedValueOnce(undefined);

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-2");

    expect(result.success).toBe(true);
    if (result.success) expect(result.following).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "social" })
    );
  });

  it("does not send push when unfollowing", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Anna Nowak" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.follows.findFirst).mockResolvedValueOnce({
      followerId: "user-1",
      followeeId: "user-2",
      createdAt: new Date(),
    } as any);

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-2");

    expect(result.success).toBe(true);
    if (result.success) expect(result.following).toBe(false);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });
});
