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

export type CreatePostInput = z.input<typeof createPostSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type CreateGroupInput = z.input<typeof createGroupSchema>;
