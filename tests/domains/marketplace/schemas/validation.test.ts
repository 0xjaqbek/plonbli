import { describe, it, expect } from "vitest";
import {
  createListingSchema,
  searchListingsSchema,
  searchFarmersSchema,
} from "@/domains/marketplace/schemas/validation";

describe("createListingSchema", () => {
  const validListing = {
    name: "Pomidory malinowe",
    description: "Swiezo zebrane pomidory",
    categoryId: "cat-123",
    method: "ECO" as const,
    tags: ["eko", "sezonowe"],
    images: [],
    price: 12.5,
    unit: "KG" as const,
    quantityAvailable: 100,
    availability: "AVAILABLE" as const,
    deliveryOptions: [
      { type: "PICKUP" as const, address: "ul. Polna 1", hours: "Pn-Pt 8-16" },
    ],
  };

  it("accepts valid listing data", () => {
    const result = createListingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      price: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid unit", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      unit: "GALLON",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty delivery options", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      deliveryOptions: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts listing without optional fields", () => {
    const result = createListingSchema.safeParse({
      name: "Jablka",
      categoryId: "cat-1",
      method: "CONVENTIONAL",
      price: 5,
      unit: "KG",
      deliveryOptions: [{ type: "PICKUP" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing categoryId", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      categoryId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("searchListingsSchema", () => {
  it("accepts empty search (browse all)", () => {
    const result = searchListingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts full search params", () => {
    const result = searchListingsSchema.safeParse({
      q: "pomidory",
      category: "warzywa",
      voivodeship: "malopolskie",
      minPrice: "5",
      maxPrice: "20",
      method: "ECO",
      sort: "price_asc",
      page: "2",
    });
    expect(result.success).toBe(true);
  });

  it("defaults sort to newest", () => {
    const result = searchListingsSchema.safeParse({});
    if (result.success) {
      expect(result.data.sort).toBe("newest");
    }
  });

  it("defaults page to 1", () => {
    const result = searchListingsSchema.safeParse({});
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("rejects invalid sort", () => {
    const result = searchListingsSchema.safeParse({ sort: "random" });
    expect(result.success).toBe(false);
  });

  it("accepts county and commune filters", () => {
    const result = searchListingsSchema.safeParse({
      voivodeship: "malopolskie",
      county: "krakowski",
      commune: "Wieliczka",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.county).toBe("krakowski");
      expect(result.data.commune).toBe("Wieliczka");
    }
  });
});

describe("searchFarmersSchema", () => {
  it("accepts empty input", () => {
    expect(searchFarmersSchema.safeParse({}).success).toBe(true);
  });

  it("accepts full location filters", () => {
    const result = searchFarmersSchema.safeParse({
      voivodeship: "mazowieckie",
      county: "warszawski zachodni",
      commune: "Błonie",
    });
    expect(result.success).toBe(true);
  });
});
