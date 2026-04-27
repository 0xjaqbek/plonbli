import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendEachForMulticast = vi.fn();

vi.mock("firebase-admin/messaging", () => ({
  getMessaging: vi.fn(() => ({ sendEachForMulticast: mockSendEachForMulticast })),
}));

vi.mock("@/shared/lib/firebase-admin", () => ({
  getFirebaseAdmin: vi.fn(() => ({})),
}));

vi.mock("@/domains/notifications/queries/get-user-tokens", () => ({
  getUserTokens: vi.fn(),
}));

vi.mock("@/domains/notifications/queries/get-notification-preferences", () => ({
  getNotificationPreferences: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  },
}));

describe("sendNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when user has no tokens", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce([]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    await sendNotification("user-1", {
      category: "messages",
      title: "Test",
      body: "Body",
      url: "/messages/1",
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("does nothing when category is disabled in preferences", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["token-1"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: false,
      social: true,
      marketplace: true,
    });

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    await sendNotification("user-1", {
      category: "messages",
      title: "Test",
      body: "Body",
      url: "/messages/1",
    });

    expect(mockSendEachForMulticast).not.toHaveBeenCalled();
  });

  it("sends to all tokens with correct payload", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["token-1", "token-2"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      responses: [{ success: true }, { success: true }],
    });

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    await sendNotification("user-1", {
      category: "messages",
      title: "Jan Kowalski",
      body: "Cześć!",
      url: "/messages/conv-1",
    });

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["token-1", "token-2"],
        data: { url: "/messages/conv-1", title: "Jan Kowalski", body: "Cześć!" },
      })
    );
  });

  it("removes invalid tokens from DB on error response", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["valid", "bad-token"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    mockSendEachForMulticast.mockResolvedValueOnce({
      responses: [
        { success: true },
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    });

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    const { db } = await import("@/shared/db");

    await sendNotification("user-1", {
      category: "messages",
      title: "Test",
      body: "Body",
      url: "/messages/1",
    });

    expect(vi.mocked(db.delete)).toHaveBeenCalled();
  });

  it("does not throw on FCM error", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["token-1"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    mockSendEachForMulticast.mockRejectedValueOnce(new Error("FCM down"));

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );

    await expect(
      sendNotification("user-1", {
        category: "messages",
        title: "Test",
        body: "Body",
        url: "/messages/1",
      })
    ).resolves.not.toThrow();
  });
});
