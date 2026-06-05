"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users, invitations } from "@/shared/db/schema";
import { registerSchema, type RegisterInput } from "../schemas/validation";
import { hashPassword } from "../lib/passwords";

type RegisterResult =
  | { success: true; userId: string }
  | { success: false; errors: Record<string, string[]> };

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, password, role, profileType, inviteCode } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    return {
      success: false,
      errors: { email: ["Ten adres email jest juz zajety"] },
    };
  }

  const passwordHash = await hashPassword(password);

  const now = new Date();
  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role,
      profileType,
      termsAcceptedAt: now,
      privacyAcceptedAt: now,
      ageConfirmedAt: now,
    })
    .returning({ id: users.id });

  if (inviteCode) {
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.code, inviteCode),
    });
    if (invitation) {
      await db
        .update(users)
        .set({ invitedById: invitation.userId })
        .where(eq(users.id, newUser.id));
    }
  }

  return { success: true, userId: newUser.id };
}
