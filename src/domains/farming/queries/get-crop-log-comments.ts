import { asc, inArray } from "drizzle-orm";
import { db } from "@/shared/db";
import { cropLogComments, users } from "@/shared/db/schema";
import { eq } from "drizzle-orm";

export async function getCropLogComments(cropLogIds: string[]) {
  if (cropLogIds.length === 0) return [];
  return db
    .select({
      id: cropLogComments.id,
      cropLogId: cropLogComments.cropLogId,
      content: cropLogComments.content,
      createdAt: cropLogComments.createdAt,
      author: {
        id: users.id,
        name: users.name,
      },
    })
    .from(cropLogComments)
    .innerJoin(users, eq(users.id, cropLogComments.authorId))
    .where(inArray(cropLogComments.cropLogId, cropLogIds))
    .orderBy(asc(cropLogComments.createdAt));
}

export type CropLogCommentView = Awaited<
  ReturnType<typeof getCropLogComments>
>[number];
