// @vitest-environment node
import { describe, expect, it } from "vitest";
import { generateCampaignContentHash } from "@/domains/crowdfunding/lib/campaign-content";
import { campaignIdFromDatabaseId } from "@/domains/crowdfunding/lib/campaign-content";
import { findCampaignPda } from "@/domains/crowdfunding/lib/pda";
import { Keypair } from "@solana/web3.js";

const campaign = {
  title: "Nowy tunel",
  description: "Budowa tunelu dla pomidorów",
  images: ["https://cdn.example/tunnel.jpg"],
  category: "FARMER_INVESTMENT",
  fundingModel: "ALL_OR_NOTHING",
  currencyMint: "So11111111111111111111111111111111111111112",
  goalAmount: "25",
  deadline: "2027-05-01T12:00:00.000Z",
};

describe("campaign content hash", () => {
  it("is deterministic and covers committed campaign metadata", async () => {
    const first = await generateCampaignContentHash(campaign);
    const second = await generateCampaignContentHash(campaign);
    const changed = await generateCampaignContentHash({
      ...campaign,
      goalAmount: "26",
    });

    expect(Buffer.from(first).toString("hex")).toBe(
      Buffer.from(second).toString("hex")
    );
    expect(Buffer.from(first).toString("hex")).not.toBe(
      Buffer.from(changed).toString("hex")
    );
  });

  it("derives a stable campaign PDA from the database id and creator", async () => {
    const creator = Keypair.generate().publicKey;
    const campaignId = await campaignIdFromDatabaseId("campaign-1");
    expect(findCampaignPda(creator, campaignId).toBase58()).toBe(
      findCampaignPda(creator, campaignId).toBase58()
    );
  });
});
