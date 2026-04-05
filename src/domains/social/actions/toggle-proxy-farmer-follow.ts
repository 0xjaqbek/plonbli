"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { proxyFarmerFollows } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type ToggleFollowResult =
  | { success: true; following: boolean }
  | { success: false; error: string };

export async function toggleProxyFarmerFollow(
  proxyFarmerId: string
): Promise<ToggleFollowResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const existing = await db.query.proxyFarmerFollows.findFirst({
    where: and(
      eq(proxyFarmerFollows.followerId, session.user.id),
      eq(proxyFarmerFollows.proxyFarmerId, proxyFarmerId)
    ),
  });

  if (existing) {
    await db
      .delete(proxyFarmerFollows)
      .where(
        and(
          eq(proxyFarmerFollows.followerId, session.user.id),
          eq(proxyFarmerFollows.proxyFarmerId, proxyFarmerId)
        )
      );
    return { success: true, following: false };
  }

  await db.insert(proxyFarmerFollows).values({
    followerId: session.user.id,
    proxyFarmerId,
  });

  return { success: true, following: true };
}
