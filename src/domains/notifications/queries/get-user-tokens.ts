import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { pushSubscriptions } from "@/shared/db/schema";

export async function getUserTokens(userId: string): Promise<string[]> {
  const rows = await db
    .select({ fcmToken: pushSubscriptions.fcmToken })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return rows.map((r) => r.fcmToken);
}
