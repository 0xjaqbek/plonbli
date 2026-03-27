import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  profileSchema,
} from "@/domains/auth/schemas/validation";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "Jan Kowalski",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "FARMER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      name: "Jan",
      email: "jan@example.com",
      password: "short",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("password");
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Jan",
      email: "not-an-email",
      password: "SecurePass123!",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("email");
  });

  it("rejects invalid role", () => {
    const result = registerSchema.safeParse({
      name: "Jan",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
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
