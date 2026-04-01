"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/shared/db";
import { proxyFarmers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createProxyFarmerSchema,
  type CreateProxyFarmerInput,
} from "../schemas/proxy-farmer";

const MAX_PROXY_PROFILES = 3;

type ActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function createProxyFarmer(
  input: CreateProxyFarmerInput
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createProxyFarmerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Check limit
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(proxyFarmers)
    .where(eq(proxyFarmers.creatorId, session.user.id));

  if (count >= MAX_PROXY_PROFILES) {
    return { success: false, error: `Osiagnieto limit ${MAX_PROXY_PROFILES} profili-ambasador` };
  }

  const { name, bio, avatar, voivodeship, county, commune, latitude, longitude, contactMethods, products } =
    parsed.data;

  const [created] = await db
    .insert(proxyFarmers)
    .values({
      creatorId: session.user.id,
      name,
      bio: bio ?? null,
      avatar: avatar ?? null,
      voivodeship: voivodeship ?? null,
      county: county ?? null,
      commune: commune ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      contactMethods,
      products,
    })
    .returning({ id: proxyFarmers.id });

  revalidatePath("/farmers");
  return { success: true, id: created.id };
}

export async function updateProxyFarmer(
  id: string,
  input: CreateProxyFarmerInput
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const existing = await db.query.proxyFarmers.findFirst({
    where: eq(proxyFarmers.id, id),
  });

  if (!existing || existing.creatorId !== session.user.id) {
    return { success: false, error: "Brak dostepu" };
  }

  const parsed = createProxyFarmerSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, bio, avatar, voivodeship, county, commune, latitude, longitude, contactMethods, products } =
    parsed.data;

  await db
    .update(proxyFarmers)
    .set({
      name,
      bio: bio ?? null,
      avatar: avatar ?? null,
      voivodeship: voivodeship ?? null,
      county: county ?? null,
      commune: commune ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      contactMethods,
      products,
    })
    .where(eq(proxyFarmers.id, id));

  revalidatePath(`/farmers/proxy/${id}`);
  revalidatePath("/farmers");
  return { success: true };
}

export async function deleteProxyFarmer(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const existing = await db.query.proxyFarmers.findFirst({
    where: eq(proxyFarmers.id, id),
  });

  if (!existing || existing.creatorId !== session.user.id) {
    return { success: false, error: "Brak dostepu" };
  }

  await db.delete(proxyFarmers).where(eq(proxyFarmers.id, id));

  revalidatePath("/farmers");
  return { success: true };
}
