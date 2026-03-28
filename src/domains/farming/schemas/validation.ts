import { z } from "zod";

export const createCropLogSchema = z.object({
  type: z.enum(["PLANTING", "GROWING", "TREATMENT", "HARVEST", "OTHER"]),
  description: z.string().min(1, "Opis jest wymagany").max(5000),
  productId: z.string().optional(),
  images: z.array(z.string()).max(10).default([]),
  data: z
    .object({
      crop: z.string().optional(),
      area: z.string().optional(),
      quantity: z.string().optional(),
      method: z.string().optional(),
    })
    .optional(),
});

export type CreateCropLogInput = z.input<typeof createCropLogSchema>;
