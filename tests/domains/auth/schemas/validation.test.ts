import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  profileSchema,
} from "@/domains/auth/schemas/validation";

const validRegisterBase = {
  name: "Jan Kowalski",
  email: "jan@example.com",
  password: "SecurePass123!",
  role: "FARMER" as const,
  profileType: "SMALL_FARM" as const,
  acceptTerms: true as const,
  acceptPrivacy: true as const,
  acceptAge: true as const,
};

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse(validRegisterBase);
    expect(result.success).toBe(true);
  });

  it("rejects missing acceptTerms", () => {
    const { acceptTerms: _, ...rest } = validRegisterBase;
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("acceptTerms");
  });

  it("rejects acceptTerms = false", () => {
    const result = registerSchema.safeParse({ ...validRegisterBase, acceptTerms: false });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("acceptTerms");
  });

  it("accepts acceptTerms = true", () => {
    const result = registerSchema.safeParse(validRegisterBase);
    expect(result.success).toBe(true);
  });

  it("rejects missing acceptAge", () => {
    const { acceptAge: _, ...rest } = validRegisterBase;
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("acceptAge");
  });

  it("rejects missing profileType", () => {
    const { profileType: _, ...rest } = validRegisterBase;
    const result = registerSchema.safeParse(rest);
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("profileType");
  });

  it("rejects invalid profileType", () => {
    const result = registerSchema.safeParse({ ...validRegisterBase, profileType: "MEGA_FARM" });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      ...validRegisterBase,
      password: "short",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("password");
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      ...validRegisterBase,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("email");
  });

  it("rejects invalid role", () => {
    const result = registerSchema.safeParse({
      ...validRegisterBase,
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      ...validRegisterBase,
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "jan@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "jan@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepts valid profile update", () => {
    const result = profileSchema.safeParse({
      name: "Jan Kowalski",
      role: "BOTH",
      voivodeship: "malopolskie",
      postalCode: "30-001",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with optional fields", () => {
    const result = profileSchema.safeParse({
      name: "Jan Kowalski",
      role: "CONSUMER",
    });
    expect(result.success).toBe(true);
  });

  it("accepts profileType update", () => {
    const result = profileSchema.safeParse({
      name: "Jan Kowalski",
      role: "FARMER",
      profileType: "LARGE_FARM",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid voivodeship", () => {
    const result = profileSchema.safeParse({
      name: "Jan",
      role: "CONSUMER",
      voivodeship: "nonexistent",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid postal code format", () => {
    const result = profileSchema.safeParse({
      name: "Jan",
      role: "CONSUMER",
      postalCode: "12345",
    });
    expect(result.success).toBe(false);
  });
});
