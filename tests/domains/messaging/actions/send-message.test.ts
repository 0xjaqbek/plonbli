import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessage } from "@/domains/messaging/actions/send-message";

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
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
    query: {
      conversationMembers: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "Hello",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes zalogowany");
    }
  });

  it("returns error when user is not a member", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.conversationMembers.findFirst).mockResolvedValueOnce(
      undefined
    );

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "Hello",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes czlonkiem tej rozmowy");
    }
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "",
    });

    expect(result.success).toBe(false);
  });

  it("sends message on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.conversationMembers.findFirst).mockResolvedValueOnce({
      conversationId: "conv-1",
      userId: "user-1",
      role: "MEMBER",
      muted: false,
      joinedAt: new Date(),
    });

    // Mock insert message
    const mockReturning = vi
      .fn()
      .mockResolvedValueOnce([{ id: "msg-1", createdAt: new Date() }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    // Mock update conversation
    vi.mocked(db.update).mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce(undefined),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "Czesc!",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.messageId).toBe("msg-1");
    }
  });

  it("triggers push notification to other conversation members after sending", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Jan Kowalski", email: "jan@example.com" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.conversationMembers.findFirst).mockResolvedValueOnce({
      conversationId: "conv-1",
      userId: "user-1",
      role: "MEMBER",
      muted: false,
      joinedAt: new Date(),
    });

    // Mock select for other members
    const mockWhere = vi.fn().mockResolvedValueOnce([{ userId: "user-2" }]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValueOnce({ from: mockFrom } as any);

    // Mock insert message
    const mockReturning = vi
      .fn()
      .mockResolvedValueOnce([{ id: "msg-1", createdAt: new Date() }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    // Mock update conversation
    vi.mocked(db.update).mockReturnValueOnce({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValueOnce(undefined) }),
    } as any);

    const result = await sendMessage({ conversationId: "conv-1", content: "Cześć!" });

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "messages", url: "/messages/conv-1" })
    );
  });
});
