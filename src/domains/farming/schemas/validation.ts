import { z } from "zod";

export const createCropLogSchema = z.object({
  type: z.enum(["PLANTING", "GROWING", "TREATMENT", "HARVEST", "OTHER"]),
  description: z.string().min(1, "Opis jest wymagany").max(5000),
  productId: z.string().optional(),
  campaignId: z.string().optional(),
  images: z.array(z.string()).max(10).default([]),
  imageHashes: z
    .array(z.string().regex(/^[a-f0-9]{64}$/))
    .max(10)
    .default([]),
  data: z
    .object({
      crop: z.string().optional(),
      area: z.string().optional(),
      quantity: z.string().optional(),
      method: z.string().optional(),
    })
    .optional(),
}).refine((value) => value.images.length === value.imageHashes.length, {
  message: "KaĹĽdy obraz musi mieÄ‡ hash SHA-256",
  path: ["imageHashes"],
});

export type CreateCropLogInput = z.input<typeof createCropLogSchema>;
