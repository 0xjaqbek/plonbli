/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAccount } from "@/domains/auth/actions/delete-account";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/db", () => {
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

  const mockTx = {
    delete: mockDelete,
    update: mockUpdate,
  };

  const mockDb = {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    }),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const result = await deleteAccount("jan@example.com");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("returns error when confirmed email does not match", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      email: "jan@example.com",
    } as any);

    const result = await deleteAccount("wrong@example.com");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("anonymizes user data when email matches", async () => {
    const { auth, signOut } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      email: "jan@example.com",
    } as any);

    const result = await deleteAccount("jan@example.com");

    expect(db.transaction).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
