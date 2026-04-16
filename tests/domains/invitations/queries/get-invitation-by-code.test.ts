import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    query: {
      invitations: {
        findFirst: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

describe("getInvitationByCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns invitation when code exists", async () => {
    const { db } = await import("@/shared/db");
    const inv = { id: "inv-1", userId: "user-1", code: "abc123", createdAt: new Date() };
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(inv as any);

    const { getInvitationByCode } = await import(
      "@/domains/invitations/queries/get-invitation-by-code"
    );
    const result = await getInvitationByCode("abc123");

    expect(result).toEqual(inv);
  });

  it("returns undefined when code does not exist", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(undefined);

    const { getInvitationByCode } = await import(
      "@/domains/invitations/queries/get-invitation-by-code"
    );
    const result = await getInvitationByCode("nonexistent");

    expect(result).toBeUndefined();
  });
});
