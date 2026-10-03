"use server";

import { auth } from "@/domains/auth/lib/auth";
import { createCropLogSchema, type CreateCropLogInput } from "../schemas/validation";
import { PostgresCropLogRepository } from "../repository/postgres";

type CreateCropLogResult =
  | { success: true; logId: string; contentHash: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createCropLog(
  input: CreateCropLogInput
): Promise<CreateCropLogResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createCropLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const repo = new PostgresCropLogRepository();
  const record = await repo.create({
    farmerId: session.user.id,
    ...parsed.data,
  });

  return { success: true, logId: record.id, contentHash: record.contentHash };
}
