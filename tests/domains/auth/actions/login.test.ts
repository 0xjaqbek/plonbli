import { describe, it, expect, vi, beforeEach } from "vitest";
import { login } from "@/domains/auth/actions/login";

vi.mock("@/domains/auth/lib/auth", () => ({
  signIn: vi.fn(),
}));

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid input", async () => {
    const result = await login({
      email: "bad",
      password: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("calls signIn with credentials on valid input", async () => {
    const { signIn } = await import("@/domains/auth/lib/auth");
    vi.mocked(signIn).mockResolvedValueOnce(undefined);

    const result = await login({
      email: "jan@example.com",
      password: "SecurePass123!",
    });

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "jan@example.com",
      password: "SecurePass123!",
      redirect: false,
    });
    expect(result.success).toBe(true);
  });

  it("returns error when signIn throws", async () => {
    const { signIn } = await import("@/domains/auth/lib/auth");
    vi.mocked(signIn).mockRejectedValueOnce(new Error("CredentialsSignin"));

    const result = await login({
      email: "jan@example.com",
      password: "WrongPassword!",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });
});
