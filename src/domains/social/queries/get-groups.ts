import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { groups, groupMembers, users } from "@/shared/db/schema";

export async function getGroups(currentUserId?: string) {
  const allGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      avatar: groups.avatar,
      type: groups.type,
      joinPolicy: groups.joinPolicy,
      voivodeship: groups.voivodeship,
      createdAt: groups.createdAt,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(groups)
    .innerJoin(users, eq(groups.createdBy, users.id))
    .orderBy(desc(groups.createdAt));

  const enriched = await Promise.all(
    allGroups.map(async (group) => {
      const [{ count: memberCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, group.id));

      let isMember = false;
      if (currentUserId) {
        const userMembership = await db.query.groupMembers.findFirst({
          where: (gm, { and, eq }) =>
            and(
              eq(gm.groupId, group.id),
              eq(gm.userId, currentUserId)
            ),
        });
        isMember = !!userMembership;
      }

      return {
        ...group,
        memberCount,
        isMember,
      };
    })
  );

  return enriched;
}

export type GroupWithDetails = Awaited<ReturnType<typeof getGroups>>[number];
