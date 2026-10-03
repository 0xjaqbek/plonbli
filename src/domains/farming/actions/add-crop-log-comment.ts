"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { cropLogComments, cropLogs } from "@/shared/db/schema";

export async function addCropLogCommentAction(
  cropLogId: string,
  rawContent: string
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Musisz się zalogować" };
  const content = rawContent.trim();
  if (content.length < 1 || content.length > 2000) {
    return { error: "Komentarz musi mieć od 1 do 2000 znaków" };
  }

  const [entry] = await db
    .select({
      id: cropLogs.id,
      campaignId: cropLogs.campaignId,
      farmerId: cropLogs.farmerId,
    })
    .from(cropLogs)
    .where(eq(cropLogs.id, cropLogId))
    .limit(1);
  if (!entry) return { error: "Wpis produkcyjny nie istnieje" };

  await db.insert(cropLogComments).values({
    cropLogId,
    authorId: session.user.id,
    content,
  });
  if (entry.campaignId) revalidatePath(`/crowdfunding/${entry.campaignId}`);
  revalidatePath(`/farmers/${entry.farmerId}/crop-log`);
  return { success: true };
}
