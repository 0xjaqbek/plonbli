import { describe, it, expect } from "vitest";
import { createCropLogSchema } from "@/domains/farming/schemas/validation";

describe("createCropLogSchema", () => {
  const validInput = {
    type: "PLANTING" as const,
    description: "Posadzono pomidory na polu nr 3",
    productId: "prod-1",
  };

  it("accepts valid input", () => {
    const result = createCropLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional data fields", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      data: { crop: "Pomidory", area: "0.5ha", quantity: "200kg" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional images array", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      images: ["img1.jpg", "img2.jpg"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images).toHaveLength(2);
    }
  });

  it("defaults images to empty array", () => {
    const result = createCropLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images).toEqual([]);
    }
  });

  it("rejects description over 5000 chars", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      description: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts without productId", () => {
    const { productId, ...withoutProduct } = validInput;
    const result = createCropLogSchema.safeParse(withoutProduct);
    expect(result.success).toBe(true);
  });
});
