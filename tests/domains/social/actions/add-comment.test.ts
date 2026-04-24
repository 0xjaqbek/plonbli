import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "comment-1" }]),
      }),
    }),
    query: {
      posts: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("addComment", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { addComment } = await import(
      "@/domains/social/actions/add-comment"
    );
    const result = await addComment({ postId: "post-1", content: "Świetny post!" });
    expect(result.success).toBe(false);
  });

  it("sends push to post author after commenting", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Piotr Wiśniewski" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.posts.findFirst).mockResolvedValueOnce({
      id: "post-1",
      authorId: "user-2",
    } as any);

    const { addComment } = await import(
      "@/domains/social/actions/add-comment"
    );
    const result = await addComment({ postId: "post-1", content: "Świetny post!" });

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "social", url: "/posts/post-1" })
    );
  });

  it("does not send push when commenting on own post", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Piotr" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.posts.findFirst).mockResolvedValueOnce({
      id: "post-1",
      authorId: "user-1",
    } as any);

    const { addComment } = await import(
      "@/domains/social/actions/add-comment"
    );
    await addComment({ postId: "post-1", content: "Mój własny post" });

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });
});
