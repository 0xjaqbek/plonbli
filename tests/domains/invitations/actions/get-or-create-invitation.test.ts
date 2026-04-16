import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn(),
    query: {
      invitations: {
        findFirst: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn().mockReturnValue("generated-id"),
}));

describe("getOrCreateInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing invitation if found", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce({
      id: "inv-1",
      userId: "user-1",
      code: "existingcode",
      createdAt: new Date(),
    } as any);

    const { getOrCreateInvitation } = await import(
      "@/domains/invitations/actions/get-or-create-invitation"
    );
    const result = await getOrCreateInvitation("user-1");

    expect(result.code).toBe("existingcode");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates new invitation when none exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(undefined);

    const newInvitation = {
      id: "inv-new",
      userId: "user-1",
      code: "generated-id",
      createdAt: new Date(),
    };

    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([newInvitation]),
      }),
    } as any);

    const { getOrCreateInvitation } = await import(
      "@/domains/invitations/actions/get-or-create-invitation"
    );
    const result = await getOrCreateInvitation("user-1");

    expect(db.insert).toHaveBeenCalled();
    expect(result.code).toBe("generated-id");
  });
});
