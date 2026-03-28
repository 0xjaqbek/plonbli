import { describe, it, expect, vi, beforeEach } from "vitest";
import { createConversation } from "@/domains/messaging/actions/create-conversation";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockDb = {
    insert: vi.fn().mockReturnValue({ values: mockValues }),
    query: {
      conversationMembers: { findMany: vi.fn() },
      conversations: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("createConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes zalogowany");
    }
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("creates conversation and adds members on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");

    // No existing conversations
    vi.mocked(db.query.conversationMembers.findMany).mockResolvedValueOnce([]);

    // Insert conversation returns id
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "conv-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({
      values: mockValues,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // Insert members
    const mockMemberValues = vi.fn().mockResolvedValueOnce([]);
    vi.mocked(db.insert).mockReturnValueOnce({
      values: mockMemberValues,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-1");
    }
  });
});
