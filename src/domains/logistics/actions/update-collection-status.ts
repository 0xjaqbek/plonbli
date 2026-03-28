"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { collections } from "@/shared/db/schema";
import {
  updateCollectionStatusSchema,
  type UpdateCollectionStatusInput,
} from "../schemas/validation";

type UpdateStatusResult =
  | { success: true; status: string }
  | { success: false; error: string };

export async function updateCollectionStatus(
  input: UpdateCollectionStatusInput
): Promise<UpdateStatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = updateCollectionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane" };
  }

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, parsed.data.collectionId),
  });

  if (!collection) {
    return { success: false, error: "Zbiorka nie istnieje" };
  }

  if (collection.coordinatorId !== session.user.id) {
    return { success: false, error: "Tylko koordynator moze zmienic status" };
  }

  await db
    .update(collections)
    .set({ status: parsed.data.status })
    .where(eq(collections.id, parsed.data.collectionId));

  return { success: true, status: parsed.data.status };
}
