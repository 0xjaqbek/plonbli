"use server";

import { eq, and } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { collectionItems, collections } from "@/shared/db/schema";
import {
  joinCollectionSchema,
  type JoinCollectionInput,
} from "../schemas/validation";

type JoinCollectionResult =
  | { success: true }
  | { success: false; error: string };

export async function joinCollection(
  input: JoinCollectionInput
): Promise<JoinCollectionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = joinCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane" };
  }

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, parsed.data.collectionId),
  });

  if (!collection) {
    return { success: false, error: "Zbiorka nie istnieje" };
  }

  if (collection.status !== "COLLECTING") {
    return { success: false, error: "Zbiorka nie przyjmuje juz uczestnikow" };
  }

  const existing = await db.query.collectionItems.findFirst({
    where: and(
      eq(collectionItems.collectionId, parsed.data.collectionId),
      eq(collectionItems.userId, session.user.id)
    ),
  });

  if (existing) {
    return { success: false, error: "Juz dolaczyles do tej zbiorki" };
  }

  await db.insert(collectionItems).values({
    collectionId: parsed.data.collectionId,
    userId: session.user.id,
    quantity: parsed.data.quantity,
    note: parsed.data.note,
  });

  return { success: true };
}
