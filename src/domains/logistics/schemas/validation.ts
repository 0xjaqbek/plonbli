import { z } from "zod";

export const createPickupPointSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(200),
  description: z.string().max(2000).default(""),
  address: z.string().min(1, "Adres jest wymagany").max(300),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  hours: z.string().max(200).optional(),
});

export type CreatePickupPointInput = z.input<typeof createPickupPointSchema>;

export const createCollectionSchema = z.object({
  groupId: z.string().min(1),
  listingId: z.string().min(1),
  title: z.string().min(1, "Tytul jest wymagany").max(200),
  description: z.string().max(2000).default(""),
  targetAmount: z.string().optional(),
  pickupAddress: z.string().max(300).optional(),
  pickupDate: z.string().optional(),
});

export type CreateCollectionInput = z.input<typeof createCollectionSchema>;

export const joinCollectionSchema = z.object({
  collectionId: z.string().min(1),
  quantity: z.string().min(1, "Ilosc jest wymagana"),
  note: z.string().max(500).optional(),
});

export type JoinCollectionInput = z.infer<typeof joinCollectionSchema>;

export const updateCollectionStatusSchema = z.object({
  collectionId: z.string().min(1),
  status: z.enum(["COLLECTING", "ORDERED", "IN_DELIVERY", "RECEIVED", "CANCELLED"]),
});

export type UpdateCollectionStatusInput = z.infer<typeof updateCollectionStatusSchema>;
