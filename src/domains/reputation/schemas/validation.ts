import { z } from "zod";

const dimensionScore = z.number().int().min(1).max(5).optional();

export const createReviewSchema = z.object({
  targetId: z.string().min(1),
  productId: z.string().optional(),
  overall: z.number().int().min(1).max(5),
  dimensions: z
    .object({
      quality: dimensionScore,
      communication: dimensionScore,
      punctuality: dimensionScore,
      accuracy: dimensionScore,
    })
    .optional(),
  comment: z.string().max(5000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
