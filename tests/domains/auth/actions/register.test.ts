import { describe, it, expect, vi, beforeEach } from "vitest";
import { register } from "@/domains/auth/actions/register";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  };
  // Chain insert().values().returning()
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mockDb.returning,
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
    });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
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
    });
    expect(result.success).toBe(false);
    expect(result.errors?.email).toBeDefined();
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
    });

    expect(hashPassword).toHaveBeenCalledWith("SecurePass123!");
    expect(result.success).toBe(true);
  });
});
