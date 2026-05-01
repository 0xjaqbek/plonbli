"use server";

import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users, authAccounts, sessions } from "@/shared/db/schema";

type DeleteAccountResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteAccount(
  confirmedEmail: string
): Promise<DeleteAccountResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return { success: false, error: "Uzytkownik nie istnieje" };
  }

  if (user.email !== confirmedEmail) {
    return {
      success: false,
      error: "Podany email nie zgadza sie z Twoim kontem",
    };
  }

  const anonymizedEmail =
    createHash("sha256").update(user.email).digest("hex") +
    "@deleted.plonbli.pl";

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.delete(authAccounts).where(eq(authAccounts.userId, user.id));
    await tx
      .update(users)
      .set({
        name: "Uzytkownik usuniety",
        email: anonymizedEmail,
        passwordHash: null,
        avatar: null,
        bio: null,
      })
      .where(eq(users.id, user.id));
  });

  await signOut({ redirectTo: "/login" });

  return { success: true };
}
