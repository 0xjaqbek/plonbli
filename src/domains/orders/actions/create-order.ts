"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  orders, orderItems, orderStatusHistory,
  cartItems, listings, products,
} from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { createOrderSchema, type CreateOrderInput } from "../schemas/validation";

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

  // Get cart items for this farmer
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
    return { success: false, error: "Koszyk jest pusty" };
  }

  // Calculate totals
  let itemsTotal = 0;
  const orderItemsData = farmerCartItems.map(({ cartItem, listing, product }) => {
    const qty = Number(cartItem.quantity);
    const price = Number(listing.price);
    const total = qty * price;
    itemsTotal += total;
    return {
      listingId: listing.id,
      productName: product.name,
      quantity: cartItem.quantity,
      unit: listing.unit,
      pricePerUnit: listing.price,
      totalPrice: String(total),
    };
  });

  // Find default shipping cost from listing delivery options
  let shippingCost: string | null = null;
  if (deliveryMethod === "DELIVERY") {
    const deliveryOption = farmerCartItems[0]?.listing.deliveryOptions?.find(
      (opt: any) => opt.type === "DELIVERY"
    );
    if (deliveryOption?.cost) {
      shippingCost = String(deliveryOption.cost);
      itemsTotal += deliveryOption.cost;
    }
  }

  const orderNumber = generateOrderNumber();

  // Transaction: create order + items + history + clear cart
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
        shippingCost,
        totalAmount: String(itemsTotal),
        customerNote: customerNote ?? null,
      })
      .returning({ id: orders.id });

    // Insert order items
    await tx.insert(orderItems).values(
      orderItemsData.map((item) => ({
        orderId: order.id,
        ...item,
      }))
    );

    // Record initial status
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      status: "PENDING",
      createdBy: session.user!.id!,
    });

    // Clear cart items for this farmer
    const cartItemIds = farmerCartItems.map(({ cartItem }) => cartItem.id);
    for (const id of cartItemIds) {
      await tx.delete(cartItems).where(eq(cartItems.id, id));
    }

    return order;
  });

  return { success: true, orderId: result.id, orderNumber };
}
