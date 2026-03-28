"use server";

import { db } from "@/shared/db";
import { events } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createEventSchema,
  type CreateEventInput,
} from "../schemas/validation";

type CreateEventResult =
  | { success: true; eventId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createEvent(
  input: CreateEventInput
): Promise<CreateEventResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const {
    title,
    description,
    type,
    groupId,
    location,
    latitude,
    longitude,
    startDate,
    endDate,
    recurrence,
  } = parsed.data;

  const [event] = await db
    .insert(events)
    .values({
      creatorId: session.user.id,
      groupId: groupId ?? null,
      title,
      description,
      type,
      location: location ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      recurrence: recurrence ?? null,
    })
    .returning({ id: events.id });

  return { success: true, eventId: event.id };
}
