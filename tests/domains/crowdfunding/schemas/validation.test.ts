import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  createCampaignSchema,
  updateCampaignSchema,
  addMilestoneSchema,
  addRewardTierSchema,
  contributeSchema,
} from "@/domains/crowdfunding/schemas/validation";

describe("createCampaignSchema", () => {
  const FIXED_NOW = new Date("2026-06-01T12:00:00Z");
  const FUTURE_DATE = "2026-12-01T00:00:00Z";
  const PAST_DATE = "2025-01-01T00:00:00Z";

  const validInput = {
    title: "Nowa kampania rolnicza",
    description: "Opis kampanii, który ma co najmniej 10 znaków",
    category: "FARMER_INVESTMENT" as const,
    fundingModel: "ALL_OR_NOTHING" as const,
    currencyMint: "SOL",
    goalAmount: 1000,
    deadline: FUTURE_DATE,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("passes with valid input", () => {
    const result = createCampaignSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("fails when title is too short (< 3 chars)", () => {
    const result = createCampaignSchema.safeParse({ ...validInput, title: "ab" });
    expect(result.success).toBe(false);
  });

  it("fails when title is too long (> 200 chars)", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      title: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("fails when description is too short (< 10 chars)", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      description: "krótki",
    });
    expect(result.success).toBe(false);
  });

  it("fails when goalAmount is 0", () => {
    const result = createCampaignSchema.safeParse({ ...validInput, goalAmount: 0 });
    expect(result.success).toBe(false);
  });

  it("fails when goalAmount is negative", () => {
    const result = createCampaignSchema.safeParse({ ...validInput, goalAmount: -50 });
    expect(result.success).toBe(false);
  });

  it("coerces string goalAmount to number", () => {
    const result = createCampaignSchema.safeParse({ ...validInput, goalAmount: "100" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.goalAmount).toBe(100);
    }
  });

  it("fails with invalid category", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      category: "INVALID_CATEGORY",
    });
    expect(result.success).toBe(false);
  });

  it("fails with invalid fundingModel", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      fundingModel: "INVALID_MODEL",
    });
    expect(result.success).toBe(false);
  });

  it("fails when deadline is in the past", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      deadline: PAST_DATE,
    });
    expect(result.success).toBe(false);
  });

  it("fails when currencyMint is empty", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      currencyMint: "",
    });
    expect(result.success).toBe(false);
  });

  it("fails when images array has more than 10 items", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      images: Array.from({ length: 11 }, (_, i) => `https://example.com/img${i}.jpg`),
    });
    expect(result.success).toBe(false);
  });

  it("fails when images contains invalid URLs", () => {
    const result = createCampaignSchema.safeParse({
      ...validInput,
      images: ["not-a-url"],
    });
    expect(result.success).toBe(false);
  });

  it("defaults images to empty array when omitted", () => {
    const result = createCampaignSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images).toEqual([]);
    }
  });

  it("accepts input without groupId (optional)", () => {
    const { groupId: _, ...inputWithoutGroup } = { ...validInput, groupId: undefined };
    const result = createCampaignSchema.safeParse(inputWithoutGroup);
    expect(result.success).toBe(true);
  });
});

describe("updateCampaignSchema", () => {
  it("passes with empty object (all fields optional)", () => {
    const result = updateCampaignSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("passes with only title", () => {
    const result = updateCampaignSchema.safeParse({ title: "Nowy tytuł" });
    expect(result.success).toBe(true);
  });

  it("fails when title is too short", () => {
    const result = updateCampaignSchema.safeParse({ title: "ab" });
    expect(result.success).toBe(false);
  });

  it("fails when images contains invalid URLs", () => {
    const result = updateCampaignSchema.safeParse({ images: ["not-a-url"] });
    expect(result.success).toBe(false);
  });
});

describe("addMilestoneSchema", () => {
  const validMilestone = {
    title: "Pierwszy kamień milowy",
    description: "Opis kamienia milowego z wystarczającą długością",
    targetAmount: 500,
  };

  it("passes with valid input", () => {
    const result = addMilestoneSchema.safeParse(validMilestone);
    expect(result.success).toBe(true);
  });

  it("fails when targetAmount is 0", () => {
    const result = addMilestoneSchema.safeParse({ ...validMilestone, targetAmount: 0 });
    expect(result.success).toBe(false);
  });

  it("coerces string targetAmount to number", () => {
    const result = addMilestoneSchema.safeParse({
      ...validMilestone,
      targetAmount: "250",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetAmount).toBe(250);
    }
  });

  it("fails when title is too short", () => {
    const result = addMilestoneSchema.safeParse({ ...validMilestone, title: "ab" });
    expect(result.success).toBe(false);
  });
});

describe("addRewardTierSchema", () => {
  const validRewardTier = {
    title: "Nagroda podstawowa",
    description: "Opis nagrody z wystarczającą długością tekstu",
    price: 50,
  };

  it("passes with valid input", () => {
    const result = addRewardTierSchema.safeParse(validRewardTier);
    expect(result.success).toBe(true);
  });

  it("fails when price is 0", () => {
    const result = addRewardTierSchema.safeParse({ ...validRewardTier, price: 0 });
    expect(result.success).toBe(false);
  });

  it("defaults maxBackers to 0 when omitted", () => {
    const result = addRewardTierSchema.safeParse(validRewardTier);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxBackers).toBe(0);
    }
  });

  it("fails when maxBackers is negative", () => {
    const result = addRewardTierSchema.safeParse({
      ...validRewardTier,
      maxBackers: -1,
    });
    expect(result.success).toBe(false);
  });

  it("defaults isProductLinked to false when omitted", () => {
    const result = addRewardTierSchema.safeParse(validRewardTier);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isProductLinked).toBe(false);
    }
  });

  it("fails when maxBackers is a float (must be int)", () => {
    const result = addRewardTierSchema.safeParse({
      ...validRewardTier,
      maxBackers: 2.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("contributeSchema", () => {
  const validContribution = {
    campaignId: "campaign-123",
    amount: 100,
  };

  it("passes with valid input", () => {
    const result = contributeSchema.safeParse(validContribution);
    expect(result.success).toBe(true);
  });

  it("fails when campaignId is empty", () => {
    const result = contributeSchema.safeParse({ ...validContribution, campaignId: "" });
    expect(result.success).toBe(false);
  });

  it("fails when amount is 0", () => {
    const result = contributeSchema.safeParse({ ...validContribution, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts input without rewardTierId (optional)", () => {
    const result = contributeSchema.safeParse(validContribution);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rewardTierId).toBeUndefined();
    }
  });
});
