"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  orders, orderItems, orderStatusHistory,
  cartItems, listings, products,
} from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { createOrderSchema, type CreateOrderInput } from "../schemas/validation";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildNewOrderNotification } from "@/domains/notifications/lib/notification-types";

type CreateOrderResult =
  | { success: true; orderId: string; orderNumber: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
  return `PLB-${year}-${random}`;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { farmerId, deliveryMethod, deliveryAddress, pickupSlotId, customerNote } = parsed.data;

  const farmerCartItems = await db
    .select({
      cartItem: cartItems,
      listing: listings,
      product: products,
    })
    .from(cartItems)
    .innerJoin(listings, eq(cartItems.listingId, listings.id))
    .innerJoin(products, eq(listings.productId, products.id))
    .where(and(eq(cartItems.userId, session.user.id), eq(products.farmerId, farmerId)));

  if (farmerCartItems.length === 0) {
    return { success: false, error: "Lista produktów jest pusta" };
  }

  const orderItemsData = farmerCartItems.map(({ cartItem, listing, product }) => ({
    listingId: listing.id,
    productName: product.name,
    quantity: cartItem.quantity,
    unit: listing.unit,
  }));

  const orderNumber = generateOrderNumber();

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        customerId: session.user!.id!,
        farmerId,
        status: "PENDING",
        deliveryMethod: deliveryMethod as "PICKUP" | "DELIVERY" | "DROP_POINT",
        deliveryAddress: deliveryAddress ?? null,
        pickupSlotId: pickupSlotId ?? null,
        customerNote: customerNote ?? null,
        farmerHasSeen: false,
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(
      orderItemsData.map((item) => ({
        orderId: order.id,
        ...item,
      }))
    );

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status: "PENDING",
      createdBy: session.user!.id!,
    });

    const cartItemIds = farmerCartItems.map(({ cartItem }) => cartItem.id);
    for (const id of cartItemIds) {
      await tx.delete(cartItems).where(eq(cartItems.id, id));
    }

    return order;
  });

  void sendNotification(
    farmerId,
    buildNewOrderNotification(session.user.name ?? "Klient", orderNumber, result.id)
  );

  return { success: true, orderId: result.id, orderNumber };
}
