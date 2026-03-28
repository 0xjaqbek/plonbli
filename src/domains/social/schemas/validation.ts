import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().min(1, "Tresc jest wymagana").max(5000),
  images: z.array(z.string().url()).max(10).default([]),
  groupId: z.string().optional(),
  type: z.enum(["POST", "ANNOUNCEMENT"]).default("POST"),
  visibility: z.enum(["PUBLIC", "GROUP", "FOLLOWERS"]),
});

export const addCommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1, "Komentarz nie moze byc pusty").max(2000),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(100),
  description: z.string().max(2000).default(""),
  type: z.enum(["BUYING_GROUP", "COMMUNITY"]),
  joinPolicy: z.enum(["OPEN", "INVITE_ONLY"]).default("OPEN"),
  voivodeship: z.string().optional(),
  commune: z.string().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(1, "Tytul jest wymagany").max(200),
  description: z.string().max(5000).default(""),
  type: z.enum(["MARKET", "OPEN_DAY", "MEETUP", "OTHER"]),
  groupId: z.string().optional(),
  location: z.string().max(300).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  startDate: z.string().min(1, "Data rozpoczecia jest wymagana"),
  endDate: z.string().min(1, "Data zakonczenia jest wymagana"),
  recurrence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
});

export const rsvpEventSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["GOING", "INTERESTED", "NOT_GOING"]),
});

export type CreatePostInput = z.input<typeof createPostSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type CreateGroupInput = z.input<typeof createGroupSchema>;
export type CreateEventInput = z.input<typeof createEventSchema>;
export type RsvpEventInput = z.infer<typeof rsvpEventSchema>;
