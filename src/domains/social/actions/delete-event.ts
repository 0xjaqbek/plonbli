"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { events } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type DeleteEventResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteEvent(
  eventId: string
): Promise<DeleteEventResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    return { success: false, error: "Wydarzenie nie istnieje" };
  }

  if (event.creatorId !== session.user.id) {
    return { success: false, error: "Mozesz usuwac tylko swoje wydarzenia" };
  }

  await db.delete(events).where(eq(events.id, eventId));

  return { success: true };
}
