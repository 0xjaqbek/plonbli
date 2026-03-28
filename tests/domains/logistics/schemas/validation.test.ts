import { describe, it, expect } from "vitest";
import {
  createPickupPointSchema,
  createCollectionSchema,
  joinCollectionSchema,
  updateCollectionStatusSchema,
} from "@/domains/logistics/schemas/validation";

describe("createPickupPointSchema", () => {
  const valid = {
    name: "Parking przy sklepie",
    address: "ul. Dluga 15, Krakow",
  };

  it("accepts valid input", () => {
    expect(createPickupPointSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      createPickupPointSchema.safeParse({ ...valid, name: "" }).success
    ).toBe(false);
  });

  it("rejects empty address", () => {
    expect(
      createPickupPointSchema.safeParse({ ...valid, address: "" }).success
    ).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createPickupPointSchema.safeParse({
      ...valid,
      description: "Przy wejsciu",
      hours: "Pn-Pt 8:00-18:00",
      latitude: "50.06",
      longitude: "19.94",
    });
    expect(result.success).toBe(true);
  });
});

describe("createCollectionSchema", () => {
  const valid = {
    groupId: "group-1",
    listingId: "listing-1",
    title: "Zbiorka na pomidory",
  };

  it("accepts valid input", () => {
    expect(createCollectionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(
      createCollectionSchema.safeParse({ ...valid, title: "" }).success
    ).toBe(false);
  });

  it("accepts optional targetAmount", () => {
    const result = createCollectionSchema.safeParse({
      ...valid,
      targetAmount: "50.00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional pickupAddress and pickupDate", () => {
    const result = createCollectionSchema.safeParse({
      ...valid,
      pickupAddress: "ul. Dluga 15",
      pickupDate: "2026-04-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("joinCollectionSchema", () => {
  it("accepts valid input", () => {
    const result = joinCollectionSchema.safeParse({
      collectionId: "col-1",
      quantity: "5.00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty quantity", () => {
    const result = joinCollectionSchema.safeParse({
      collectionId: "col-1",
      quantity: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCollectionStatusSchema", () => {
  it("accepts valid status", () => {
    const result = updateCollectionStatusSchema.safeParse({
      collectionId: "col-1",
      status: "ORDERED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateCollectionStatusSchema.safeParse({
      collectionId: "col-1",
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});
