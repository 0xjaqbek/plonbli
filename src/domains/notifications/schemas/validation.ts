import { z } from "zod";

export const savePushTokenSchema = z.object({
  fcmToken: z.string().min(1),
});

export const updatePreferencesSchema = z.object({
  messages: z.boolean(),
  social: z.boolean(),
  marketplace: z.boolean(),
});

export type SavePushTokenInput = z.infer<typeof savePushTokenSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
