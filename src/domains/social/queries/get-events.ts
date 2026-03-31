import { eq, desc, gte, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { events, users, groups, eventRsvps } from "@/shared/db/schema";

export async function getEvents(options?: {
  upcoming?: boolean;
  groupId?: string;
}) {
  const conditions = [];

  if (options?.upcoming !== false) {
    conditions.push(gte(events.startDate, new Date()));
  }

  if (options?.groupId) {
    conditions.push(eq(events.groupId, options.groupId));
  }

  const allEvents = await db
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
      coverImage: events.coverImage,
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(events.startDate));

  const enriched = await Promise.all(
    allEvents.map(async (event) => {
      const [{ count: goingCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.status, "GOING")
          )
        );

      const [{ count: interestedCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.status, "INTERESTED")
          )
        );

      return {
        ...event,
        goingCount,
        interestedCount,
      };
    })
  );

  return enriched;
}

export type EventWithDetails = Awaited<ReturnType<typeof getEvents>>[number];
