import { z } from "zod";

const deliveryOptionSchema = z.object({
  type: z.enum(["PICKUP", "DELIVERY", "DROP_POINT"]),
  address: z.string().optional(),
  radius: z.coerce.number().positive().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  hours: z.string().optional(),
});

export const createListingSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(255),
  description: z.string().max(5000).default(""),
  categoryId: z.string().min(1, "Kategoria jest wymagana"),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).default("CONVENTIONAL"),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  price: z.coerce.number().positive("Cena musi byc wieksza od 0"),
  unit: z.enum(["KG", "PIECE", "LITER", "BUNCH"]),
  quantityAvailable: z.coerce.number().positive().optional(),
  availability: z
    .enum(["AVAILABLE", "SEASONAL", "OUT_OF_STOCK"])
    .default("AVAILABLE"),
  validUntil: z.string().optional(),
  deliveryOptions: z
    .array(deliveryOptionSchema)
    .min(1, "Dodaj przynajmniej jedna opcje dostawy"),
});

export const searchListingsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  voivodeship: z.string().optional(),
  county: z.string().optional(),
  commune: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "name"])
    .default("newest"),
  page: z.coerce.number().default(1),
});

export const searchFarmersSchema = z.object({
  voivodeship: z.string().optional(),
  county: z.string().optional(),
  commune: z.string().optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
export type DeliveryOptionInput = z.infer<typeof deliveryOptionSchema>;
export type SearchFarmersInput = z.infer<typeof searchFarmersSchema>;
