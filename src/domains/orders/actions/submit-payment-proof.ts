"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, paymentProofs } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { submitPaymentProofSchema, type SubmitPaymentProofInput } from "../schemas/validation";

type SubmitProofResult =
  | { success: true; proofId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function submitPaymentProof(input: SubmitPaymentProofInput): Promise<SubmitProofResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = submitPaymentProofSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, type, imageUrl, transactionUrl, description } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.customerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "CONFIRMED") {
    return { success: false, error: "Nie mozna przeslac dowodu platnosci w tym statusie" };
  }

  const [proof] = await db
    .insert(paymentProofs)
    .values({
      orderId,
      type: type as "SCREENSHOT" | "BANK_TRANSFER" | "BLOCKCHAIN_LINK",
      imageUrl: imageUrl ?? null,
      transactionUrl: transactionUrl ?? null,
      description: description ?? null,
    })
    .returning({ id: paymentProofs.id });

  await db
    .update(orders)
    .set({ farmerHasSeen: false })
    .where(eq(orders.id, orderId));

  return { success: true, proofId: proof.id };
}
