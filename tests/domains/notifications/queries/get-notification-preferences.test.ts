import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => ({
  db: {
    query: {
      notificationPreferences: { findFirst: vi.fn() },
    },
  },
}));

describe("getNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all-true defaults when no row exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.notificationPreferences.findFirst).mockResolvedValueOnce(
      undefined
    );

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    const prefs = await getNotificationPreferences("user-1");

    expect(prefs).toEqual({ messages: true, social: true, marketplace: true, crowdfunding: true });
  });

  it("returns stored preferences when row exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.notificationPreferences.findFirst).mockResolvedValueOnce({
      userId: "user-1",
      messages: true,
      social: false,
      marketplace: true,
      updatedAt: new Date(),
    } as any);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    const prefs = await getNotificationPreferences("user-1");

    expect(prefs.social).toBe(false);
    expect(prefs.messages).toBe(true);
  });
});
