import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("savePushToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { savePushToken } = await import(
      "@/domains/notifications/actions/save-push-token"
    );
    const result = await savePushToken({ fcmToken: "token-abc" });
    expect(result.success).toBe(false);
  });

  it("returns error for empty token", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const { savePushToken } = await import(
      "@/domains/notifications/actions/save-push-token"
    );
    const result = await savePushToken({ fcmToken: "" });
    expect(result.success).toBe(false);
  });

  it("saves token and creates preferences row on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const { db } = await import("@/shared/db");
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi
      .fn()
      .mockReturnValue({ onConflictDoNothing: mockOnConflict });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const { savePushToken } = await import(
      "@/domains/notifications/actions/save-push-token"
    );
    const result = await savePushToken({ fcmToken: "token-abc" });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(2);
  });
});
