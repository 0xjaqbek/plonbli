"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { eventRsvps } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  rsvpEventSchema,
  type RsvpEventInput,
} from "../schemas/validation";

type RsvpEventResult =
  | { success: true; status: string | null }
  | { success: false; error: string };

export async function rsvpEvent(
  input: RsvpEventInput
): Promise<RsvpEventResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = rsvpEventSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane" };
  }

  const { eventId, status } = parsed.data;

  const existing = await db.query.eventRsvps.findFirst({
    where: and(
      eq(eventRsvps.eventId, eventId),
      eq(eventRsvps.userId, session.user.id)
    ),
  });

  // Toggle off if same status
  if (existing && existing.status === status) {
    await db
      .delete(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, session.user.id)
        )
      );
    return { success: true, status: null };
  }

  // Remove existing and insert new
  if (existing) {
    await db
      .delete(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, session.user.id)
        )
      );
  }

  await db.insert(eventRsvps).values({
    eventId,
    userId: session.user.id,
    status,
  });

  return { success: true, status };
}
