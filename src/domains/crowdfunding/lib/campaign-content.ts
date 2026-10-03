import BN from "bn.js";
import { generateContentHash } from "./content-hash";

export type CampaignHashInput = {
  title: string;
  description: string;
  images: string[];
  category: string;
  fundingModel: string;
  currencyMint: string;
  goalAmount: string;
  deadline: string;
};

export function canonicalCampaignContent(input: CampaignHashInput): string {
  return JSON.stringify({
    version: 1,
    title: input.title.trim(),
    description: input.description.trim(),
    images: [...input.images],
    category: input.category,
    fundingModel: input.fundingModel,
    currencyMint: input.currencyMint,
    goalAmount: input.goalAmount,
    deadline: new Date(input.deadline).toISOString(),
  });
}

export async function generateCampaignContentHash(
  input: CampaignHashInput
): Promise<Uint8Array> {
  return generateContentHash(canonicalCampaignContent(input));
}

export async function campaignIdFromDatabaseId(id: string): Promise<BN> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`plonbli-campaign:${id}`) as BufferSource
  );
  return new BN(new Uint8Array(digest).slice(0, 8), "le");
}
