import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("updateNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { updateNotificationPreferences } = await import(
      "@/domains/notifications/actions/update-notification-preferences"
    );
    const result = await updateNotificationPreferences({
      messages: true,
      social: false,
      marketplace: true,
    });
    expect(result.success).toBe(false);
  });

  it("upserts preferences on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi
      .fn()
      .mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const { updateNotificationPreferences } = await import(
      "@/domains/notifications/actions/update-notification-preferences"
    );
    const result = await updateNotificationPreferences({
      messages: true,
      social: false,
      marketplace: true,
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.insert)).toHaveBeenCalled();
  });
});
