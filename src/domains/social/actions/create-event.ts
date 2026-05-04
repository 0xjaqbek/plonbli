"use server";

import { db } from "@/shared/db";
import { events } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { geocodeLocation } from "@/domains/geo/geocode";
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
    voivodeship,
    county,
    commune,
    coverImage,
    startDate,
    endDate,
    recurrence,
  } = parsed.data;

  let latitude: string | null = null;
  let longitude: string | null = null;
  let location: string | null = null;

  if (voivodeship || county || commune) {
    const coords = await geocodeLocation({ voivodeship, county, commune });
    if (coords) {
      latitude = coords.latitude;
      longitude = coords.longitude;
    }
    location = [commune, county, voivodeship].filter(Boolean).join(", ");
  }

  const [event] = await db
    .insert(events)
    .values({
      creatorId: session.user.id,
      groupId: groupId ?? null,
      title,
      description,
      type,
      location,
      latitude,
      longitude,
      coverImage: coverImage ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      recurrence: recurrence ?? null,
    })
    .returning({ id: events.id });

  return { success: true, eventId: event.id };
}
