import { eq, and, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { events, users, groups, eventRsvps } from "@/shared/db/schema";

export async function getEvent(eventId: string, currentUserId?: string) {
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      type: events.type,
      location: events.location,
      latitude: events.latitude,
      longitude: events.longitude,
      startDate: events.startDate,
      endDate: events.endDate,
      recurrence: events.recurrence,
      createdAt: events.createdAt,
      creator: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      groupId: events.groupId,
      groupName: groups.name,
    })
    .from(events)
    .innerJoin(users, eq(events.creatorId, users.id))
    .leftJoin(groups, eq(events.groupId, groups.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return null;

  // Get RSVP counts
  const [{ count: goingCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "GOING"))
    );

  const [{ count: interestedCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(eventRsvps)
    .where(
      and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.status, "INTERESTED")
      )
    );

  // Get attendees
  const attendees = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      status: eventRsvps.status,
    })
    .from(eventRsvps)
    .innerJoin(users, eq(eventRsvps.userId, users.id))
    .where(eq(eventRsvps.eventId, eventId));

  // Check current user's RSVP
  let currentUserRsvp: string | null = null;
  if (currentUserId) {
    const rsvp = await db.query.eventRsvps.findFirst({
      where: and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, currentUserId)
      ),
    });
    currentUserRsvp = rsvp?.status ?? null;
  }

  return {
    ...event,
    goingCount,
    interestedCount,
    attendees,
    currentUserRsvp,
  };
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
