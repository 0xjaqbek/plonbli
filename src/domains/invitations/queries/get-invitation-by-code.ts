import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { invitations } from "@/shared/db/schema";
import type { Invitation } from "@/shared/db/schema";

export async function getInvitationByCode(
  code: string
): Promise<Invitation | undefined> {
  return db.query.invitations.findFirst({
    where: eq(invitations.code, code),
  });
}
