import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1, "Wiadomosc nie moze byc pusta").max(5000),
  images: z.array(z.string().url()).max(5).default([]),
});

export const createConversationSchema = z
  .object({
    type: z.enum(["DIRECT", "GROUP"]),
    name: z.string().max(100).optional(),
    participantIds: z.array(z.string().min(1)),
  })
  .refine(
    (data) => {
      if (data.type === "DIRECT") return data.participantIds.length === 1;
      return data.participantIds.length >= 2;
    },
    {
      message:
        "Rozmowa bezposrednia wymaga 1 uczestnika, grupowa min. 2",
      path: ["participantIds"],
    }
  );

export type SendMessageInput = z.input<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<
  typeof createConversationSchema
>;
