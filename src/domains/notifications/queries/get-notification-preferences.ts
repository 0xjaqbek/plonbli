import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { notificationPreferences } from "@/shared/db/schema";

interface Preferences {
  messages: boolean;
  social: boolean;
  marketplace: boolean;
  crowdfunding: boolean;
}

const DEFAULTS: Preferences = { messages: true, social: true, marketplace: true, crowdfunding: true };

export async function getNotificationPreferences(
  userId: string
): Promise<Preferences> {
  const row = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });

  if (!row) return DEFAULTS;

  return { messages: row.messages, social: row.social, marketplace: row.marketplace, crowdfunding: row.crowdfunding };
}
