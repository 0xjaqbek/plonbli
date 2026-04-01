import { z } from "zod";
import { VOIVODESHIPS } from "@/domains/geo";

const contactMethodSchema = z.object({
  type: z.enum(["PHONE", "EMAIL", "IN_PERSON", "PICKUP", "OTHER"]),
  value: z.string().min(1, "Dane kontaktowe sa wymagane").max(255),
  note: z.string().max(255).optional(),
});

const proxyProductSchema = z.object({
  name: z.string().min(1, "Nazwa produktu jest wymagana").max(255),
  category: z.string().max(100).optional(),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).optional(),
  description: z.string().max(500).optional(),
});

export const createProxyFarmerSchema = z.object({
  name: z.string().min(1, "Imie rolnika jest wymagane").max(255),
  bio: z.string().max(1000).nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  voivodeship: z.enum(VOIVODESHIPS).nullable().optional(),
  county: z.string().max(100).nullable().optional(),
  commune: z.string().max(100).nullable().optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
  contactMethods: z
    .array(contactMethodSchema)
    .min(1, "Wymagana co najmniej jedna metoda kontaktu")
    .max(5),
  products: z.array(proxyProductSchema).max(10).default([]),
});

export type CreateProxyFarmerInput = z.output<typeof createProxyFarmerSchema>;
export type CreateProxyFarmerFormInput = z.input<typeof createProxyFarmerSchema>;
