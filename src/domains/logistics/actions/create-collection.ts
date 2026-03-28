"use server";

import { eq, and } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { collections, groupMembers } from "@/shared/db/schema";
import {
  createCollectionSchema,
  type CreateCollectionInput,
} from "../schemas/validation";

type CreateCollectionResult =
  | { success: true; collectionId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createCollection(
  input: CreateCollectionInput
): Promise<CreateCollectionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, parsed.data.groupId),
      eq(groupMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return { success: false, error: "Nie jestes czlonkiem tej grupy" };
  }

  const [collection] = await db
    .insert(collections)
    .values({
      groupId: parsed.data.groupId,
      listingId: parsed.data.listingId,
      coordinatorId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      targetAmount: parsed.data.targetAmount,
      pickupAddress: parsed.data.pickupAddress,
      pickupDate: parsed.data.pickupDate
        ? new Date(parsed.data.pickupDate)
        : undefined,
    })
    .returning({ id: collections.id });

  return { success: true, collectionId: collection.id };
}
