"use server";

import { resolveSharedEntity, type SharedEntityData } from "../queries/resolve-shared-entity";

export async function getSharedEntity(
  entityType: string,
  entityId: string
): Promise<SharedEntityData | null> {
  return resolveSharedEntity(entityType, entityId);
}
