import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("deletePushToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { deletePushToken } = await import(
      "@/domains/notifications/actions/delete-push-token"
    );
    const result = await deletePushToken({ fcmToken: "token-abc" });
    expect(result.success).toBe(false);
  });

  it("deletes token on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const { db } = await import("@/shared/db");
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

    const { deletePushToken } = await import(
      "@/domains/notifications/actions/delete-push-token"
    );
    const result = await deletePushToken({ fcmToken: "token-abc" });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.delete)).toHaveBeenCalled();
  });
});
