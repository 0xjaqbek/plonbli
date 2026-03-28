import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReview } from "@/domains/reputation/actions/create-review";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/domains/reputation/repository/postgres", () => {
  const MockRepo = class {
    create = vi.fn().mockResolvedValue({
      id: "review-1",
      reviewerId: "user-1",
      targetId: "user-2",
      overall: 5,
      contentHash: "abc123",
      previousHash: null,
      createdAt: new Date(),
    });
  };
  return { PostgresReviewRepository: MockRepo };
});

describe("createReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createReview({
      targetId: "user-2",
      overall: 5,
    });

    expect(result.success).toBe(false);
  });

  it("returns error when reviewing self", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createReview({
      targetId: "user-1",
      overall: 5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie mozesz ocenic siebie");
    }
  });

  it("creates review on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createReview({
      targetId: "user-2",
      overall: 5,
      comment: "Swietne produkty!",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reviewId).toBe("review-1");
    }
  });

  it("returns error for invalid rating", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createReview({
      targetId: "user-2",
      overall: 0,
    });

    expect(result.success).toBe(false);
  });
});
