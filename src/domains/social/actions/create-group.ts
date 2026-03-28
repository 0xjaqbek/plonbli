"use server";

import { db } from "@/shared/db";
import { groups, groupMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createGroupSchema,
  type CreateGroupInput,
} from "../schemas/validation";

type CreateGroupResult =
  | { success: true; groupId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createGroup(
  input: CreateGroupInput
): Promise<CreateGroupResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, description, type, joinPolicy, voivodeship, commune } =
    parsed.data;

  const [group] = await db
    .insert(groups)
    .values({
      name,
      description,
      type,
      joinPolicy,
      createdBy: session.user.id,
      voivodeship: voivodeship ?? null,
      commune: commune ?? null,
    })
    .returning({ id: groups.id });

  // Add creator as admin member
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: session.user.id,
    role: "ADMIN",
  });

  return { success: true, groupId: group.id };
}
