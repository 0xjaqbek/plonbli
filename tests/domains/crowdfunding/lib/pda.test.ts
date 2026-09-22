// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Mock constants with Token Program ID which reliably produces PDAs
vi.mock("@/domains/crowdfunding/lib/constants", async () => {
  const { PublicKey: PK } = await import("@solana/web3.js");
  return {
    CROWDFUNDING_PROGRAM_ID: new PK(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    ),
  };
});

import {
  findPlatformConfigPda,
  findCampaignPda,
  findVaultPda,
  findMilestonePda,
  findRewardTierPda,
  findContributionPda,
} from "@/domains/crowdfunding/lib/pda";

// Use fixed, well-known public keys for deterministic tests
const creatorA = new PublicKey("11111111111111111111111111111112");
const creatorB = new PublicKey("So11111111111111111111111111111111111111112");
const backerA = new PublicKey("SysvarC1ock11111111111111111111111111111111");
const backerB = new PublicKey("SysvarRent111111111111111111111111111111111");

describe("findPlatformConfigPda", () => {
  it("returns a valid PublicKey", () => {
    const pda = findPlatformConfigPda();
    expect(pda).toBeInstanceOf(PublicKey);
    expect(pda.toBuffer()).toHaveLength(32);
  });

  it("is deterministic (same output every call)", () => {
    const pda1 = findPlatformConfigPda();
    const pda2 = findPlatformConfigPda();
    expect(pda1.equals(pda2)).toBe(true);
  });
});

describe("findCampaignPda", () => {
  it("returns different PDAs for different creators", () => {
    const pdaA = findCampaignPda(creatorA, 1);
    const pdaB = findCampaignPda(creatorB, 1);
    expect(pdaA.equals(pdaB)).toBe(false);
  });

  it("returns different PDAs for different campaign IDs", () => {
    const pda1 = findCampaignPda(creatorA, 1);
    const pda2 = findCampaignPda(creatorA, 2);
    expect(pda1.equals(pda2)).toBe(false);
  });

  it("accepts both number and BN for campaignId and produces same result", () => {
    const fromNumber = findCampaignPda(creatorA, 42);
    const fromBN = findCampaignPda(creatorA, new BN(42));
    expect(fromNumber.equals(fromBN)).toBe(true);
  });

  it("is deterministic for same inputs", () => {
    const pda1 = findCampaignPda(creatorA, 5);
    const pda2 = findCampaignPda(creatorA, 5);
    expect(pda1.equals(pda2)).toBe(true);
  });
});

describe("findVaultPda", () => {
  it("returns a valid PublicKey for a campaign PDA", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const vault = findVaultPda(campaign);
    expect(vault).toBeInstanceOf(PublicKey);
  });

  it("returns different PDAs for different campaigns", () => {
    const campaignA = findCampaignPda(creatorA, 1);
    const campaignB = findCampaignPda(creatorA, 2);
    const vaultA = findVaultPda(campaignA);
    const vaultB = findVaultPda(campaignB);
    expect(vaultA.equals(vaultB)).toBe(false);
  });
});

describe("findMilestonePda", () => {
  it("returns different PDAs for different indices", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const milestone0 = findMilestonePda(campaign, 0);
    const milestone1 = findMilestonePda(campaign, 1);
    expect(milestone0.equals(milestone1)).toBe(false);
  });

  it("is deterministic for same inputs", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const a = findMilestonePda(campaign, 0);
    const b = findMilestonePda(campaign, 0);
    expect(a.equals(b)).toBe(true);
  });
});

describe("findRewardTierPda", () => {
  it("returns different PDAs for different indices", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const tier0 = findRewardTierPda(campaign, 0);
    const tier1 = findRewardTierPda(campaign, 1);
    expect(tier0.equals(tier1)).toBe(false);
  });

  it("is deterministic for same inputs", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const a = findRewardTierPda(campaign, 0);
    const b = findRewardTierPda(campaign, 0);
    expect(a.equals(b)).toBe(true);
  });
});

describe("findContributionPda", () => {
  it("returns different PDAs for different backers", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const contribA = findContributionPda(campaign, backerA);
    const contribB = findContributionPda(campaign, backerB);
    expect(contribA.equals(contribB)).toBe(false);
  });

  it("is deterministic for same inputs", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const a = findContributionPda(campaign, backerA);
    const b = findContributionPda(campaign, backerA);
    expect(a.equals(b)).toBe(true);
  });
});

describe("all PDAs are valid Solana addresses", () => {
  it("none of the PDA derivations throw", () => {
    const campaign = findCampaignPda(creatorA, 1);
    expect(() => findPlatformConfigPda()).not.toThrow();
    expect(() => findCampaignPda(creatorA, 1)).not.toThrow();
    expect(() => findCampaignPda(creatorA, new BN(1))).not.toThrow();
    expect(() => findVaultPda(campaign)).not.toThrow();
    expect(() => findMilestonePda(campaign, 0)).not.toThrow();
    expect(() => findRewardTierPda(campaign, 0)).not.toThrow();
    expect(() => findContributionPda(campaign, backerA)).not.toThrow();
  });

  it("all returned PDAs are valid PublicKey instances with 32-byte data", () => {
    const campaign = findCampaignPda(creatorA, 1);
    const pdas = [
      findPlatformConfigPda(),
      findCampaignPda(creatorA, 1),
      findVaultPda(campaign),
      findMilestonePda(campaign, 0),
      findRewardTierPda(campaign, 0),
      findContributionPda(campaign, backerA),
    ];

    for (const pda of pdas) {
      expect(pda).toBeInstanceOf(PublicKey);
      expect(pda.toBuffer()).toHaveLength(32);
    }
  });
});
