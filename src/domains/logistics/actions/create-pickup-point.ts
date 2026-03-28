"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { pickupPoints } from "@/shared/db/schema";
import {
  createPickupPointSchema,
  type CreatePickupPointInput,
} from "../schemas/validation";

type CreatePickupPointResult =
  | { success: true; pointId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createPickupPoint(
  input: CreatePickupPointInput
): Promise<CreatePickupPointResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createPickupPointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const [point] = await db
    .insert(pickupPoints)
    .values({
      createdBy: session.user.id,
      ...parsed.data,
    })
    .returning({ id: pickupPoints.id });

  return { success: true, pointId: point.id };
}
