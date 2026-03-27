import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/domains/auth/lib/passwords";

describe("passwords", () => {
  it("hashes a password and verifies it correctly", async () => {
    const password = "TestPassword123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("CorrectPassword123!");
    expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const password = "TestPassword123!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});
