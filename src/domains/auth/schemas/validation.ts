import { z } from "zod";
import { VOIVODESHIPS } from "@/domains/geo";

export const PROFILE_TYPES = ["PRIVATE", "SMALL_FARM", "MEDIUM_FARM", "LARGE_FARM"] as const;
export type ProfileType = typeof PROFILE_TYPES[number];

export const registerSchema = z.object({
  name: z.string().min(1, "Imie jest wymagane").max(255),
  email: z.string().email("Nieprawidlowy adres email").max(255),
  password: z.string().min(8, "Haslo musi miec minimum 8 znakow").max(128),
  role: z.enum(["FARMER", "CONSUMER", "BOTH"]),
  profileType: z.enum(PROFILE_TYPES, {
    error: "Wybierz typ profilu",
  }),
  inviteCode: z.string().optional(),
  acceptTerms: z.literal(true, {
    error: "Musisz zaakceptowac regulamin",
  }),
  acceptPrivacy: z.literal(true, {
    error: "Musisz zaakceptowac polityke prywatnosci",
  }),
  acceptAge: z.literal(true, {
    error: "Musisz potwierdzic pelnoletnosc",
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Nieprawidlowy adres email"),
  password: z.string().min(1, "Haslo jest wymagane"),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Imie jest wymagane").max(255),
  avatar: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  role: z.enum(["FARMER", "CONSUMER", "BOTH"]),
  profileType: z.enum(PROFILE_TYPES).optional(),
  voivodeship: z.enum(VOIVODESHIPS).nullable().optional(),
  county: z.string().max(100).nullable().optional(),
  commune: z.string().max(100).nullable().optional(),
  postalCode: z
    .string()
    .regex(/^\d{2}-\d{3}$/, "Nieprawidlowy kod pocztowy (format: XX-XXX)")
    .nullable()
    .optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
