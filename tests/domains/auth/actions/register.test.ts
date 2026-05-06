/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { register } from "@/domains/auth/actions/register";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
      invitations: {
        findFirst: vi.fn(),
      },
    },
  };
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mockDb.returning,
    }),
  });
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
  return { db: mockDb };
});

vi.mock("@/domains/auth/lib/passwords", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid input", async () => {
    const result = await register({
      name: "",
      email: "bad",
      password: "short",
      role: "CONSUMER",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toBeDefined();
  });

  it("returns error when email already exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "existing",
      email: "jan@example.com",
    } as any);

    const result = await register({
      name: "Jan",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
      acceptTerms: true,
      acceptPrivacy: true,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors?.email).toBeDefined();
  });

  it("creates user with hashed password on valid input", async () => {
    const { db } = await import("@/shared/db");
    const { hashPassword } = await import("@/domains/auth/lib/passwords");

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.insert({} as any).values({} as any).returning)
      .mockResolvedValueOnce([{ id: "new-id", email: "jan@example.com" }] as any);

    const result = await register({
      name: "Jan Kowalski",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "FARMER",
      acceptTerms: true,
      acceptPrivacy: true,
    });

    expect(hashPassword).toHaveBeenCalledWith("SecurePass123!");
    expect(result.success).toBe(true);
  });

  it("sets invitedById when valid inviteCode is provided", async () => {
    const { db } = await import("@/shared/db");

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce({
      id: "inv-1",
      userId: "inviter-id",
      code: "validcode",
      createdAt: new Date(),
    } as any);
    vi.mocked(db.insert({} as any).values({} as any).returning)
      .mockResolvedValueOnce([{ id: "new-id" }] as any);

    const result = await register({
      name: "Nowy Uzytkownik",
      email: "nowy@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
      inviteCode: "validcode",
      acceptTerms: true,
      acceptPrivacy: true,
    });

    expect(result.success).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it("ignores invalid inviteCode and registers successfully", async () => {
    const { db } = await import("@/shared/db");

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.insert({} as any).values({} as any).returning)
      .mockResolvedValueOnce([{ id: "new-id" }] as any);

    const result = await register({
      name: "Nowy Uzytkownik",
      email: "nowy2@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
      inviteCode: "bogusCode",
      acceptTerms: true,
      acceptPrivacy: true,
    });

    expect(result.success).toBe(true);
    expect(db.update).not.toHaveBeenCalled();
  });
});
