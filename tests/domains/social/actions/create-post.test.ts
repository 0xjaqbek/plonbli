import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPost } from "@/domains/social/actions/create-post";

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

describe("createPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createPost({
      content: "Test post",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes zalogowany");
    }
  });

  it("returns error for empty content", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createPost({
      content: "",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(false);
  });

  it("creates post on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "post-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await createPost({
      content: "Swiezy zbiory!",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.postId).toBe("post-1");
    }
  });

  it("returns error for group post when not a member", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.groupMembers.findFirst).mockResolvedValueOnce(undefined);

    const result = await createPost({
      content: "Post w grupie",
      groupId: "group-1",
      visibility: "GROUP",
    });

    expect(result.success).toBe(false);
  });
});
