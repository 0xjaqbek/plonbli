import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    select: vi.fn(),
  };
  return { db: mockDb };
});

describe("getInvitedUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of users invited by given userId", async () => {
    const { db } = await import("@/shared/db");
    const mockUsers = [
      { name: "Anna Kowalska", createdAt: new Date("2026-04-10") },
      { name: "Piotr Nowak", createdAt: new Date("2026-04-12") },
    ];

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValueOnce(mockUsers),
        }),
      }),
    } as any);

    const { getInvitedUsers } = await import(
      "@/domains/invitations/queries/get-invited-users"
    );
    const result = await getInvitedUsers("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Anna Kowalska");
  });

  it("returns empty array when no one was invited", async () => {
    const { db } = await import("@/shared/db");

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValueOnce([]),
        }),
      }),
    } as any);

    const { getInvitedUsers } = await import(
      "@/domains/invitations/queries/get-invited-users"
    );
    const result = await getInvitedUsers("user-1");

    expect(result).toHaveLength(0);
  });
});
