import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";

export type InvitedUser = {
  name: string;
  createdAt: Date;
};

export async function getInvitedUsers(userId: string): Promise<InvitedUser[]> {
  return db
    .select({ name: users.name, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.invitedById, userId))
    .orderBy(desc(users.createdAt));
}
