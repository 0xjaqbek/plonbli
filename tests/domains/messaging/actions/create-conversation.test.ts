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
      orders: { findFirst: vi.fn() },
      listings: { findFirst: vi.fn() },
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

  it("creates conversation with orderId when user is party to the order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "user-1",
      farmerId: "user-2",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(db.query.conversationMembers.findMany).mockResolvedValueOnce([]);

    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "conv-order-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const mockMemberValues = vi.fn().mockResolvedValueOnce([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockMemberValues } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-order-1");
    }
  });

  it("returns error when user is not party to the order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "user-3",
      farmerId: "user-2",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Brak dostępu");
    }
  });

  it("returns error when orderId does not exist", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-nonexistent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Brak dostępu");
    }
  });

  it("returns existing conversation when same orderId already has a conversation", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "user-1",
      farmerId: "user-2",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(db.query.conversationMembers.findMany)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce([{ conversationId: "conv-existing" }] as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockResolvedValueOnce([{ conversationId: "conv-existing", userId: "user-2" }] as any);

    vi.mocked(db.query.conversations.findFirst).mockResolvedValueOnce({
      id: "conv-existing",
      type: "DIRECT",
      orderId: "order-1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-existing");
    }
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates conversation with listingId when listing exists", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "listing-1",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    vi.mocked(db.query.conversationMembers.findMany).mockResolvedValueOnce([]);

    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "conv-listing-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const mockMemberValues = vi.fn().mockResolvedValueOnce([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockMemberValues } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      listingId: "listing-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-listing-1");
    }
  });

  it("returns error when listingId does not exist", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      listingId: "listing-nonexistent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ogłoszenie nie istnieje");
    }
  });
});
