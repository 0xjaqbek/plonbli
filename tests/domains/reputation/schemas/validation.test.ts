import { describe, it, expect } from "vitest";
import { createReviewSchema } from "@/domains/reputation/schemas/validation";

describe("createReviewSchema", () => {
  const validInput = {
    targetId: "user-2",
    overall: 4,
    comment: "Swietne pomidory!",
  };

  it("accepts valid input", () => {
    const result = createReviewSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing targetId", () => {
    const { targetId, ...without } = validInput;
    const result = createReviewSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejects overall below 1", () => {
    const result = createReviewSchema.safeParse({ ...validInput, overall: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects overall above 5", () => {
    const result = createReviewSchema.safeParse({ ...validInput, overall: 6 });
    expect(result.success).toBe(false);
  });

  it("accepts dimensions", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      dimensions: { quality: 5, communication: 4 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects dimension values below 1", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      dimensions: { quality: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects dimension values above 5", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      dimensions: { quality: 6 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts without comment", () => {
    const { comment, ...withoutComment } = validInput;
    const result = createReviewSchema.safeParse(withoutComment);
    expect(result.success).toBe(true);
  });

  it("accepts optional productId", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      productId: "prod-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects comment over 5000 chars", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});
