"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { farmerPaymentMethods, users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { farmerPaymentMethodSchema, type FarmerPaymentMethodInput } from "../schemas/validation";

type PaymentMethodResult =
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
    return { error: "Tylko rolnicy moga zarzadzac metodami platnosci" };
  }

  return { userId: session.user.id };
}

export async function addPaymentMethod(input: FarmerPaymentMethodInput): Promise<PaymentMethodResult> {
  const farmer = await requireFarmer();
  if ("error" in farmer) return { success: false, error: farmer.error };

  const parsed = farmerPaymentMethodSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { type, label, details, isDefault } = parsed.data;

  if (isDefault) {
    await db
      .update(farmerPaymentMethods)
      .set({ isDefault: false })
      .where(eq(farmerPaymentMethods.farmerId, farmer.userId));
  }

  const [method] = await db
    .insert(farmerPaymentMethods)
    .values({
      farmerId: farmer.userId,
      type: type as "BLIK" | "TRANSFER" | "CRYPTO",
      label,
      details,
      isDefault: isDefault ?? false,
    })
    .returning({ id: farmerPaymentMethods.id });

  return { success: true, id: method.id };
}

export async function updatePaymentMethod(id: string, input: FarmerPaymentMethodInput): Promise<SimpleResult> {
  const farmer = await requireFarmer();
  if ("error" in farmer) return { success: false, error: farmer.error };

  const parsed = farmerPaymentMethodSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Nieprawidlowe dane" };

  const existing = await db.query.farmerPaymentMethods.findFirst({
    where: and(eq(farmerPaymentMethods.id, id), eq(farmerPaymentMethods.farmerId, farmer.userId)),
  });

  if (!existing) return { success: false, error: "Metoda platnosci nie istnieje" };

  const { type, label, details, isDefault } = parsed.data;

  if (isDefault) {
    await db
      .update(farmerPaymentMethods)
      .set({ isDefault: false })
      .where(eq(farmerPaymentMethods.farmerId, farmer.userId));
  }

  await db
    .update(farmerPaymentMethods)
    .set({
      type: type as "BLIK" | "TRANSFER" | "CRYPTO",
      label,
      details,
      isDefault: isDefault ?? existing.isDefault,
    })
    .where(eq(farmerPaymentMethods.id, id));

  return { success: true };
}

export async function deletePaymentMethod(id: string): Promise<SimpleResult> {
  const farmer = await requireFarmer();
  if ("error" in farmer) return { success: false, error: farmer.error };

  const existing = await db.query.farmerPaymentMethods.findFirst({
    where: and(eq(farmerPaymentMethods.id, id), eq(farmerPaymentMethods.farmerId, farmer.userId)),
  });

  if (!existing) return { success: false, error: "Metoda platnosci nie istnieje" };

  await db.delete(farmerPaymentMethods).where(eq(farmerPaymentMethods.id, id));

  return { success: true };
}
