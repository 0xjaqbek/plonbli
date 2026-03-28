"use server";

import { auth } from "@/domains/auth/lib/auth";
import {
  createReviewSchema,
  type CreateReviewInput,
} from "../schemas/validation";
import { PostgresReviewRepository } from "../repository/postgres";

type CreateReviewResult =
  | { success: true; reviewId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createReview(
  input: CreateReviewInput
): Promise<CreateReviewResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (parsed.data.targetId === session.user.id) {
    return { success: false, error: "Nie mozesz ocenic siebie" };
  }

  const repo = new PostgresReviewRepository();
  const record = await repo.create({
    reviewerId: session.user.id,
    ...parsed.data,
  });

  return { success: true, reviewId: record.id };
}
