import { z } from "zod";

// ── Campaign Schemas ──────────────────────────────────────────────────

export const createCampaignSchema = z.object({
  title: z.string().min(3, "Tytuł jest wymagany").max(200),
  description: z.string().min(10, "Opis musi mieć co najmniej 10 znaków").max(10000),
  images: z.array(z.string().url()).default([]),
  category: z.enum(["FARMER_INVESTMENT", "GROUP_PRE_ORDER", "COMMUNITY_PROJECT"]),
  groupId: z.string().optional(),
  fundingModel: z.enum(["ALL_OR_NOTHING", "KEEP_WHAT_YOU_RAISE"]),
  currencyMint: z.string().min(1, "Waluta jest wymagana"),
  goalAmount: z.coerce.number().positive("Cel musi być większy od 0"),
  deadline: z.string().refine(
    (val) => new Date(val).getTime() > Date.now(),
    "Termin musi być w przyszłości"
  ),
});

export const updateCampaignSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(10000).optional(),
  images: z.array(z.string().url()).optional(),
});

// ── Milestone Schemas ─────────────────────────────────────────────────

export const addMilestoneSchema = z.object({
  title: z.string().min(3, "Tytuł jest wymagany").max(200),
  description: z.string().min(10, "Opis musi mieć co najmniej 10 znaków").max(5000),
  targetAmount: z.coerce.number().positive("Kwota musi być większa od 0"),
});

// ── Reward Tier Schemas ───────────────────────────────────────────────

export const addRewardTierSchema = z.object({
  title: z.string().min(3, "Tytuł jest wymagany").max(200),
  description: z.string().min(10, "Opis musi mieć co najmniej 10 znaków").max(5000),
  price: z.coerce.number().positive("Cena musi być większa od 0"),
  maxBackers: z.coerce.number().int().nonnegative().default(0),
  isProductLinked: z.boolean().default(false),
  productId: z.string().optional(),
});

// ── Contribution Schemas ──────────────────────────────────────────────

export const contributeSchema = z.object({
  campaignId: z.string().min(1),
  amount: z.coerce.number().positive("Kwota musi być większa od 0"),
  rewardTierId: z.string().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type AddMilestoneInput = z.infer<typeof addMilestoneSchema>;
export type AddRewardTierInput = z.infer<typeof addRewardTierSchema>;
export type ContributeInput = z.infer<typeof contributeSchema>;
