import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/shared/db";
import { invitations } from "@/shared/db/schema";
import type { Invitation } from "@/shared/db/schema";

export async function getOrCreateInvitation(userId: string): Promise<Invitation> {
  const existing = await db.query.invitations.findFirst({
    where: eq(invitations.userId, userId),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(invitations)
    .values({ userId, code: createId() })
    .returning();

  return created;
}
