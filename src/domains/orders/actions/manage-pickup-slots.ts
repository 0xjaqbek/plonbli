"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { pickupSlots, users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { pickupSlotSchema, type PickupSlotInput } from "../schemas/validation";

type SlotResult =
  | { success: true; id: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

type SimpleResult = { success: true } | { success: false; error: string };

async function requireFarmer(): Promise<{ error: string } | { userId: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Nie jestes zalogowany" };

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || (user.role !== "FARMER" && user.role !== "BOTH")) {
    return { error: "Tylko rolnicy moga zarzadzac slotami odbioru" };
  }

  return { userId: session.user.id };
}

export async function addPickupSlot(input: PickupSlotInput, orderId?: string): Promise<SlotResult> {
  const farmer = await requireFarmer();
  if ("error" in farmer) return { success: false, error: farmer.error };

  const parsed = pickupSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { dayOfWeek, specificDate, startTime, endTime } = parsed.data;

  const [slot] = await db
    .insert(pickupSlots)
    .values({
      farmerId: farmer.userId,
      orderId: orderId ?? null,
      dayOfWeek: dayOfWeek ?? null,
      specificDate: specificDate ?? null,
      startTime,
      endTime,
    })
    .returning({ id: pickupSlots.id });

  return { success: true, id: slot.id };
}

export async function updatePickupSlot(id: string, input: PickupSlotInput): Promise<SimpleResult> {
  const farmer = await requireFarmer();
  if ("error" in farmer) return { success: false, error: farmer.error };

  const parsed = pickupSlotSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Nieprawidlowe dane" };

  const existing = await db.query.pickupSlots.findFirst({
    where: and(eq(pickupSlots.id, id), eq(pickupSlots.farmerId, farmer.userId)),
  });

  if (!existing) return { success: false, error: "Slot nie istnieje" };

  const { dayOfWeek, specificDate, startTime, endTime } = parsed.data;

  await db
    .update(pickupSlots)
    .set({
      dayOfWeek: dayOfWeek ?? null,
      specificDate: specificDate ?? null,
      startTime,
      endTime,
    })
    .where(eq(pickupSlots.id, id));

  return { success: true };
}

export async function deletePickupSlot(id: string): Promise<SimpleResult> {
  const farmer = await requireFarmer();
  if ("error" in farmer) return { success: false, error: farmer.error };

  const existing = await db.query.pickupSlots.findFirst({
    where: and(eq(pickupSlots.id, id), eq(pickupSlots.farmerId, farmer.userId)),
  });

  if (!existing) return { success: false, error: "Slot nie istnieje" };

  await db.delete(pickupSlots).where(eq(pickupSlots.id, id));

  return { success: true };
}
