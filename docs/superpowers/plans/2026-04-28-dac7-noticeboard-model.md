# DAC7 — Noticeboard Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all financial data tracking from the orders domain so plonbli qualifies as a pure noticeboard platform exempt from DAC7 reporting.

**Architecture:** Schema-first: drop `payment_proofs` and `farmer_payment_methods` tables; remove financial columns from `orders` and `order_items`; delete payment actions/components; replace stored prices with computed indicative values derived from `listing.price` at render time (never stored).

**Tech Stack:** Drizzle ORM (db:generate + db:migrate), Next.js Server Actions, React, next-intl

---

### Task 1: DB Schema — Remove payment tables and financial columns

**Files:**
- Modify: `src/shared/db/schema/payments.ts`
- Modify: `src/shared/db/schema/orders.ts`
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Replace payments.ts with empty file**

Replace entire content of `src/shared/db/schema/payments.ts` with an empty export so Drizzle generates DROP TABLE migrations:

```ts
// Removed for DAC7 compliance — payment tracking dropped from platform
```

- [ ] **Step 2: Update orders.ts — remove financial columns and payment enums**

Replace entire content of `src/shared/db/schema/orders.ts`:

```ts
import { pgTable, text, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { listings } from "./listings";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "MODIFIED",
  "CONFIRMED",
  "PAID", // kept in DB enum (Postgres cannot remove enum values); never set by application code
  "PREPARING",
  "SHIPPED",
  "READY_FOR_PICKUP",
  "COMPLETED",
  "CANCELLED",
]);

export const deliveryMethodEnum = pgEnum("delivery_method", [
  "PICKUP",
  "DELIVERY",
  "DROP_POINT",
]);

export const cancelledByEnum = pgEnum("cancelled_by", [
  "CUSTOMER",
  "FARMER",
]);

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderNumber: text("order_number").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => users.id),
  farmerId: text("farmer_id").notNull().references(() => users.id),
  status: orderStatusEnum("status").notNull().default("PENDING"),
  deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),
  deliveryAddress: text("delivery_address"),
  pickupSlotId: text("pickup_slot_id"),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  customerNote: text("customer_note"),
  farmerNote: text("farmer_note"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: cancelledByEnum("cancelled_by"),
  customerHasSeen: boolean("customer_has_seen").notNull().default(true),
  farmerHasSeen: boolean("farmer_has_seen").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  listingId: text("listing_id").notNull().references(() => listings.id),
  productName: text("product_name").notNull(),
  quantity: text("quantity").notNull(),
  unit: text("unit").notNull(),
  modifiedQuantity: text("modified_quantity"),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

export const orderStatusHistory = pgTable("order_status_history", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  status: orderStatusEnum("status").notNull(),
  note: text("note"),
  createdBy: text("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type NewOrderStatusHistory = typeof orderStatusHistory.$inferInsert;
```

- [ ] **Step 3: Update relations.ts — remove payment relations**

Remove the following from `src/shared/db/schema/relations.ts`:
1. The import line: `import { paymentProofs, farmerPaymentMethods } from "./payments";`
2. The `paymentProofs: many(paymentProofs),` line inside `ordersRelations`
3. The entire `paymentProofsRelations` block
4. The entire `farmerPaymentMethodsRelations` block

The updated `ordersRelations` should be:
```ts
export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id], relationName: "customerOrders" }),
  farmer: one(users, { fields: [orders.farmerId], references: [users.id], relationName: "farmerOrders" }),
  pickupSlot: one(pickupSlots, { fields: [orders.pickupSlotId], references: [pickupSlots.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
}));
```

- [ ] **Step 4: Update schema/index.ts — remove payment exports**

Remove the entire `// Payments` block (lines that export from `./payments`):
```ts
// DELETE this block:
// Payments
export {
  paymentProofs, farmerPaymentMethods,
  paymentProofTypeEnum, farmerPaymentTypeEnum,
  type PaymentProof, type NewPaymentProof,
  type FarmerPaymentMethod, type NewFarmerPaymentMethod,
} from "./payments";
```

Also update the Orders export block to remove payment enum exports:
```ts
// Orders
export {
  orders, orderItems, orderStatusHistory,
  orderStatusEnum, deliveryMethodEnum, cancelledByEnum,
  type Order, type NewOrder, type OrderItem, type NewOrderItem,
  type OrderStatusHistory, type NewOrderStatusHistory,
} from "./orders";
```

Also in the relations export block, remove:
- `paymentProofsRelations, farmerPaymentMethodsRelations,`

- [ ] **Step 5: Generate and apply migration**

```bash
cd D:/plonbli
npm run db:generate
npm run db:migrate
```

Expected: migration drops `payment_proofs` and `farmer_payment_methods` tables, drops columns `shipping_cost`, `payment_method`, `payment_required`, `total_amount` from `orders`, drops columns `price_per_unit`, `total_price`, `modified_price_per_unit` from `order_items`, drops enums `payment_method` and `payment_required`.

- [ ] **Step 6: Commit**

```bash
git add src/shared/db/schema/ drizzle/
git commit -m "feat(dac7): remove payment tables and financial columns from schema"
```

---

### Task 2: Validation schema — remove payment fields

**Files:**
- Modify: `src/domains/orders/schemas/validation.ts`

- [ ] **Step 1: Replace validation.ts**

```ts
import { z } from "zod";

export const addToCartSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().positive("Ilosc musi byc wieksza od 0"),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const createOrderSchema = z
  .object({
    farmerId: z.string().min(1),
    deliveryMethod: z.enum(["PICKUP", "DELIVERY", "DROP_POINT"]),
    deliveryAddress: z.string().optional(),
    pickupSlotId: z.string().optional(),
    customerNote: z.string().max(2000).optional(),
  })
  .refine(
    (data) => {
      if (data.deliveryMethod === "DELIVERY") return !!data.deliveryAddress;
      return true;
    },
    { message: "Adres dostawy jest wymagany", path: ["deliveryAddress"] },
  );

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

const modifyItemSchema = z.object({
  orderItemId: z.string().min(1),
  modifiedQuantity: z.coerce.number().nonnegative().optional(),
});

export const modifyOrderSchema = z.object({
  orderId: z.string().min(1),
  items: z.array(modifyItemSchema).optional(),
  farmerNote: z.string().max(2000).optional(),
  pickupSlotIds: z.array(z.string()).optional(),
});

export type ModifyOrderInput = z.infer<typeof modifyOrderSchema>;

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().max(2000).optional(),
});

export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const updateOrderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PREPARING", "READY_FOR_PICKUP"]),
  note: z.string().max(2000).optional(),
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const shippingInfoSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().min(1, "Numer przesylki jest wymagany"),
  trackingUrl: z.string().url().optional(),
});

export type ShippingInfoInput = z.infer<typeof shippingInfoSchema>;

export const pickupSlotSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    specificDate: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  })
  .refine(
    (data) => data.dayOfWeek !== undefined || data.specificDate !== undefined,
    { message: "Wymagany dzien tygodnia lub konkretna data" },
  );

export type PickupSlotInput = z.infer<typeof pickupSlotSchema>;
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/schemas/
git commit -m "feat(dac7): remove payment fields from order validation schemas"
```

---

### Task 3: Delete payment actions, update orders/index.ts and types

**Files:**
- Delete: `src/domains/orders/actions/submit-payment-proof.ts`
- Delete: `src/domains/orders/actions/verify-payment.ts`
- Delete: `src/domains/orders/actions/manage-payment-methods.ts`
- Modify: `src/domains/orders/index.ts`
- Modify: `src/domains/orders/types/index.ts`

- [ ] **Step 1: Delete payment action files**

```bash
rm src/domains/orders/actions/submit-payment-proof.ts
rm src/domains/orders/actions/verify-payment.ts
rm src/domains/orders/actions/manage-payment-methods.ts
```

- [ ] **Step 2: Update orders/index.ts**

Replace with:
```ts
export {
  addToCartSchema,
  createOrderSchema,
  modifyOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  shippingInfoSchema,
  pickupSlotSchema,
  type AddToCartInput,
  type CreateOrderInput,
  type ModifyOrderInput,
  type CancelOrderInput,
  type UpdateOrderStatusInput,
  type ShippingInfoInput,
  type PickupSlotInput,
} from "./schemas/validation";

export { addToCart } from "./actions/add-to-cart";
export { updateCartItem } from "./actions/update-cart-item";
export { removeFromCart } from "./actions/remove-from-cart";
export { createOrder } from "./actions/create-order";
export { modifyOrder } from "./actions/modify-order";
export { acceptModification } from "./actions/accept-modification";
export { confirmOrder } from "./actions/confirm-order";
export { updateOrderStatus, markAsShipped } from "./actions/update-order-status";
export { completeOrder } from "./actions/complete-order";
export { cancelOrder } from "./actions/cancel-order";
export { addPickupSlot, updatePickupSlot, deletePickupSlot } from "./actions/manage-pickup-slots";

export type { OrderStatus, DeliveryMethod } from "./types";

export { hasUnseenOrderChanges } from "./queries/has-unseen-order-changes";
export { markOrderSeen } from "./actions/mark-order-seen";
```

- [ ] **Step 3: Update types/index.ts**

Remove `PaymentMethod` type and `PAID` from labels (it stays in DB enum but shouldn't be rendered):

```ts
export type OrderStatus =
  | "PENDING"
  | "MODIFIED"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type DeliveryMethod = "PICKUP" | "DELIVERY" | "DROP_POINT";

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: "Odbior osobisty",
  DELIVERY: "Wysylka",
  DROP_POINT: "Punkt odbioru",
};
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/orders/
git commit -m "feat(dac7): remove payment actions and types from orders domain"
```

---

### Task 4: Update create-order action

**Files:**
- Modify: `src/domains/orders/actions/create-order.ts`

- [ ] **Step 1: Replace create-order.ts**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/actions/create-order.ts
git commit -m "feat(dac7): remove financial calculation from create-order"
```

---

### Task 5: Update modify-order action

**Files:**
- Modify: `src/domains/orders/actions/modify-order.ts`

- [ ] **Step 1: Replace modify-order.ts**

```ts
"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { modifyOrderSchema, type ModifyOrderInput } from "../schemas/validation";

type ModifyOrderResult = { success: true } | { success: false; error?: string; errors?: Record<string, string[]> };

export async function modifyOrder(input: ModifyOrderInput): Promise<ModifyOrderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = modifyOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, items, farmerNote } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zapytanie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "PENDING") {
    return { success: false, error: "Zapytanie nie moze byc zmodyfikowane w tym statusie" };
  }

  await db.transaction(async (tx) => {
    if (items?.length) {
      for (const item of items) {
        await tx
          .update(orderItems)
          .set({
            modifiedQuantity: item.modifiedQuantity !== undefined ? String(item.modifiedQuantity) : null,
          })
          .where(and(eq(orderItems.id, item.orderItemId), eq(orderItems.orderId, orderId)));
      }
    }

    await tx
      .update(orders)
      .set({
        status: "MODIFIED",
        farmerNote: farmerNote ?? order.farmerNote,
        customerHasSeen: false,
      })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "MODIFIED",
      note: farmerNote,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/actions/modify-order.ts
git commit -m "feat(dac7): remove price modification from modify-order"
```

---

### Task 6: Update get-order query and delete payment query

**Files:**
- Modify: `src/domains/orders/queries/get-order.ts`
- Delete: `src/domains/orders/queries/get-farmer-payment-methods.ts`

- [ ] **Step 1: Delete get-farmer-payment-methods.ts**

```bash
rm src/domains/orders/queries/get-farmer-payment-methods.ts
```

- [ ] **Step 2: Replace get-order.ts**

```ts
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders } from "@/shared/db/schema";

export async function getOrder(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: {
      customer: true,
      farmer: true,
      items: {
        with: {
          listing: true,
        },
      },
      statusHistory: {
        orderBy: (h: any, { asc }: any) => [asc(h.createdAt)],
      },
      pickupSlot: true,
    },
  });
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/queries/
git commit -m "feat(dac7): remove payment methods from get-order, delete payment query"
```

---

### Task 7: Update OrderItemsTable component

**Files:**
- Modify: `src/domains/orders/components/order-detail/order-items-table.tsx`

The items from `getOrder` include `listing.price` via the Drizzle relation join. The component now uses that for the indicative price display instead of the removed `pricePerUnit`.

- [ ] **Step 1: Replace order-items-table.tsx**

```tsx
"use client";

import { useTranslations } from "next-intl";
import type { OrderItem } from "@/shared/db/schema";
import type { Listing } from "@/shared/db/schema";

type OrderItemWithListing = OrderItem & { listing: Pick<Listing, "price"> };

interface OrderItemsTableProps {
  items: OrderItemWithListing[];
  showModified?: boolean;
}

export function OrderItemsTable({ items, showModified = false }: OrderItemsTableProps) {
  const t = useTranslations("orders");

  const indicativeTotal = items.reduce((sum, item) => {
    const qty = showModified && item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
    return sum + qty * Number(item.listing.price);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">{t("product")}</th>
              <th className="text-right py-2">{t("quantity")}</th>
              <th className="text-right py-2">{t("pricePerUnit")}</th>
              <th className="text-right py-2">{t("total")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const qty = showModified && item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
              const unitPrice = Number(item.listing.price);

              return (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.productName}</td>
                  <td className="text-right py-2">
                    {showModified && item.modifiedQuantity ? (
                      <span>
                        <span className="line-through text-muted-foreground mr-1">{Number(item.quantity)}</span>
                        <span className="text-primary font-medium">{qty}</span>
                      </span>
                    ) : (
                      qty
                    )}{" "}
                    {item.unit.toLowerCase()}
                  </td>
                  <td className="text-right py-2">{unitPrice.toFixed(2)} zł</td>
                  <td className="text-right py-2 font-medium">{(qty * unitPrice).toFixed(2)} zł</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between font-semibold pt-1 border-t">
        <span>{t("indicativeValue")}</span>
        <span>{indicativeTotal.toFixed(2)} zł</span>
      </div>
      <p className="text-xs text-muted-foreground italic">{t("indicativeValueNote")}</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/components/order-detail/order-items-table.tsx
git commit -m "feat(dac7): replace stored price with indicative value in OrderItemsTable"
```

---

### Task 8: Update ModificationReview component

**Files:**
- Modify: `src/domains/orders/components/order-detail/modification-review.tsx`

Remove financial total comparison — only show quantity changes and farmer note.

- [ ] **Step 1: Replace modification-review.tsx**

```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { AlertTriangle } from "lucide-react";
import { acceptModification } from "../../actions/accept-modification";
import { cancelOrder } from "../../actions/cancel-order";
import { OrderItemsTable } from "./order-items-table";
import type { OrderDetail } from "../../queries/get-order";

interface ModificationReviewProps {
  orderId: string;
  items: OrderDetail["items"];
  farmerNote: string | null;
}

export function ModificationReview({ orderId, items, farmerNote }: ModificationReviewProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptModification(orderId);
      if (result.success) router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId, reason: t("modificationRejected") });
      if (result.success) router.refresh();
    });
  }

  return (
    <Card className="border-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="h-5 w-5" />
          {t("statusModified")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {farmerNote && (
          <p className="text-sm bg-muted p-3 rounded-lg">{t("farmerNote")}: {farmerNote}</p>
        )}
        <OrderItemsTable items={items} showModified />
      </CardContent>
      <CardFooter className="gap-3">
        <Button onClick={handleAccept} isLoading={isPending} className="flex-1">
          {t("acceptModification")}
        </Button>
        <Button variant="destructive" onClick={handleReject} isLoading={isPending} className="flex-1">
          {t("rejectModification")}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/components/order-detail/modification-review.tsx
git commit -m "feat(dac7): remove price totals from modification review"
```

---

### Task 9: Update FarmerOrderDetail component

**Files:**
- Modify: `src/domains/orders/components/farmer-dashboard/farmer-order-detail.tsx`

Remove: payment verification section (`canVerifyPayment`, proofs display). Update `canPrepare` — farmer can now prepare as soon as order is CONFIRMED (no payment gate).

- [ ] **Step 1: Replace farmer-order-detail.tsx**

```tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Check, Package, Truck, User } from "lucide-react";
import { OrderTimeline } from "../order-detail/order-timeline";
import { OrderItemsTable } from "../order-detail/order-items-table";
import { confirmOrder } from "../../actions/confirm-order";
import { updateOrderStatus, markAsShipped } from "../../actions/update-order-status";
import { cancelOrder } from "../../actions/cancel-order";
import type { OrderDetail } from "../../queries/get-order";
import { useBadges } from "@/shared/lib/badge-context";

interface FarmerOrderDetailProps {
  order: OrderDetail;
}

export function FarmerOrderDetail({ order }: FarmerOrderDetailProps) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showModify, setShowModify] = useState(false);
  const { clearUnseenOrders } = useBadges();

  useEffect(() => {
    clearUnseenOrders();
  }, []);

  const STATUS_LABELS: Record<string, string> = {
    PENDING: t("statusPending"),
    MODIFIED: t("statusModified"),
    CONFIRMED: t("statusConfirmed"),
    PREPARING: t("statusPreparing"),
    SHIPPED: t("statusShipped"),
    READY_FOR_PICKUP: t("statusReadyForPickup"),
    COMPLETED: t("statusCompleted"),
    CANCELLED: t("statusCancelled"),
  };

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmOrder(order.id);
      if (result.success) router.refresh();
    });
  }

  function handleStatusChange(status: "PREPARING" | "READY_FOR_PICKUP") {
    startTransition(async () => {
      const result = await updateOrderStatus({ orderId: order.id, status });
      if (result.success) router.refresh();
    });
  }

  function handleShip() {
    startTransition(async () => {
      const result = await markAsShipped({
        orderId: order.id,
        trackingNumber,
        trackingUrl: trackingUrl || undefined,
      });
      if (result.success) router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId: order.id, reason: cancelReason });
      if (result.success) router.refresh();
    });
  }

  const canConfirm = order.status === "PENDING";
  const canModify = order.status === "PENDING";
  const canPrepare = order.status === "CONFIRMED";
  const canShip = order.status === "PREPARING" && order.deliveryMethod === "DELIVERY";
  const canMarkReady = order.status === "PREPARING" && order.deliveryMethod !== "DELIVERY";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> {order.customer.name}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      </div>

      {order.customerNote && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{t("customerNote")}: {order.customerNote}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("items")}</CardTitle></CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} showModified={order.status !== "PENDING"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("actions")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canConfirm && (
            <div className="flex flex-col gap-2">
              <Button onClick={handleConfirm} isLoading={isPending}>
                <Check className="h-4 w-4 mr-2" />
                {t("confirm")}
              </Button>
              <Button variant="outline" onClick={() => setShowModify(true)} disabled={isPending}>
                {t("modify")}
              </Button>
            </div>
          )}

          {showModify && canModify && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-muted-foreground">{t("modifyHint")}</p>
                <p className="text-xs text-muted-foreground italic">{t("modifyFormPlaceholder")}</p>
                <Button variant="ghost" onClick={() => setShowModify(false)}>{tCommon("cancel")}</Button>
              </CardContent>
            </Card>
          )}

          {canPrepare && (
            <Button onClick={() => handleStatusChange("PREPARING")} isLoading={isPending}>
              <Package className="h-4 w-4 mr-2" />
              {t("markPreparing")}
            </Button>
          )}

          {canMarkReady && (
            <Button onClick={() => handleStatusChange("READY_FOR_PICKUP")} isLoading={isPending}>
              <Check className="h-4 w-4 mr-2" />
              {t("markReady")}
            </Button>
          )}

          {canShip && (
            <div className="space-y-3">
              <Label>{t("trackingNumber")}</Label>
              <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="PL123456789" />
              <Label>{t("trackingUrl")}</Label>
              <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://..." />
              <Button onClick={handleShip} isLoading={isPending} disabled={!trackingNumber}>
                <Truck className="h-4 w-4 mr-2" />
                {t("markShipped")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("history")}</CardTitle></CardHeader>
        <CardContent>
          <OrderTimeline history={order.statusHistory} />
        </CardContent>
      </Card>

      {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
        <div>
          {!showCancel ? (
            <Button variant="destructive" onClick={() => setShowCancel(true)}>{t("cancel")}</Button>
          ) : (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Label>{t("cancelReason")}</Label>
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={handleCancel} isLoading={isPending} disabled={!cancelReason}>
                    {t("cancel")}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCancel(false)}>{tCommon("cancel")}</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/components/farmer-dashboard/farmer-order-detail.tsx
git commit -m "feat(dac7): remove payment verification from farmer order detail"
```

---

### Task 10: Update OrderDetail (customer view) component

**Files:**
- Modify: `src/domains/orders/components/order-detail/order-detail.tsx`

Remove: payment proof form, payment proofs list, shipping cost display, totalAmount display, farmerPaymentMethods display. Update `ModificationReview` call to match new props.

- [ ] **Step 1: Replace order-detail.tsx**

```tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { MessageCircle, Package, Truck, MapPin, ExternalLink } from "lucide-react";
import { OrderTimeline } from "./order-timeline";
import { OrderItemsTable } from "./order-items-table";
import { ModificationReview } from "./modification-review";
import { completeOrder } from "../../actions/complete-order";
import { cancelOrder } from "../../actions/cancel-order";
import { createConversation } from "@/domains/messaging";
import type { OrderDetail as OrderDetailType } from "../../queries/get-order";
import { useBadges } from "@/shared/lib/badge-context";

interface OrderDetailProps {
  order: OrderDetailType;
  isCustomer: boolean;
}

export function OrderDetail({ order, isCustomer }: OrderDetailProps) {
  const t = useTranslations("orders");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { clearUnseenOrders } = useBadges();

  useEffect(() => {
    clearUnseenOrders();
  }, []);

  function handleComplete() {
    startTransition(async () => {
      const result = await completeOrder(order.id);
      if (result.success) router.refresh();
    });
  }

  function handleMessageAboutOrder() {
    const otherPartyId = isCustomer ? order.farmer.id : order.customer.id;
    startTransition(async () => {
      const result = await createConversation({
        type: "DIRECT",
        participantIds: [otherPartyId],
        orderId: order.id,
      });
      if (result.success) {
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId: order.id, reason: cancelReason || undefined });
      if (result.success) router.refresh();
    });
  }

  const showModificationReview = isCustomer && order.status === "MODIFIED";
  const canComplete = isCustomer && (order.status === "SHIPPED" || order.status === "READY_FOR_PICKUP");
  const canCancel = isCustomer && ["PENDING", "MODIFIED"].includes(order.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString("pl")}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {t(`status${order.status.charAt(0) + order.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as any)}
        </Badge>
      </div>

      {showModificationReview && (
        <ModificationReview
          orderId={order.id}
          items={order.items}
          farmerNote={order.farmerNote}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("items")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} showModified={order.status !== "PENDING"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {order.deliveryMethod === "DELIVERY" ? <Truck className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
            {t("delivery")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>{t(`delivery${order.deliveryMethod.charAt(0) + order.deliveryMethod.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as any)}</p>
          {order.deliveryAddress && <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>}
          {order.trackingNumber && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="text-sm">{t("trackingNumber")}: {order.trackingNumber}</span>
              {order.trackingUrl && (
                <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("history")}</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline history={order.statusHistory} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        {canComplete && (
          <Button onClick={handleComplete} isLoading={isPending} className="flex-1">
            {t("completeOrder")}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={handleMessageAboutOrder}
          isLoading={isPending}
          className="flex items-center gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          {t("messageToFarmer")}
        </Button>
        {canCancel && (
          <Button variant="destructive" onClick={() => setShowCancel(true)} disabled={isPending}>
            {t("cancel")}
          </Button>
        )}
      </div>

      {showCancel && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <textarea
              className="w-full border rounded p-2 text-sm"
              placeholder={t("cancelReason")}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={handleCancel} isLoading={isPending}>
                {t("cancel")}
              </Button>
              <Button variant="ghost" onClick={() => setShowCancel(false)}>
                {tCommon("back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/components/order-detail/order-detail.tsx
git commit -m "feat(dac7): remove payment sections from customer order detail"
```

---

### Task 11: Update CheckoutForm and CartView

**Files:**
- Modify: `src/domains/orders/components/checkout/checkout-form.tsx`
- Modify: `src/domains/orders/components/cart/cart-view.tsx`

- [ ] **Step 1: Update checkout-form.tsx**

Remove `totalValue` from analytics event. Replace the total summary card with an indicative value disclaimer. Keep per-item prices (indicative from listing prices) and add the inquiry note.

In `checkout-form.tsx`:
1. Change analytics call (line 48-53) — remove `totalValue`:
```ts
trackEvent(EVENTS.ORDER_PLACED, {
  orderId: result.orderId,
  farmerId,
  itemCount: cartGroup.items.length,
});
```

2. Replace the subtotal Card (lines 65-79) with:
```tsx
<Card>
  <CardHeader><CardTitle>{t("subtotal")}</CardTitle></CardHeader>
  <CardContent className="space-y-2">
    {cartGroup.items.map((item) => (
      <div key={item.cartItem.id} className="flex justify-between text-sm">
        <span>{item.product.name} x {Number(item.cartItem.quantity)} {item.listing.unit.toLowerCase()}</span>
        <span>{(Number(item.cartItem.quantity) * Number(item.listing.price)).toFixed(2)} zł</span>
      </div>
    ))}
    <div className="border-t pt-2 flex justify-between font-semibold">
      <span>{t("indicativeValue")}</span>
      <span>{cartGroup.total.toFixed(2)} zł</span>
    </div>
    <p className="text-xs text-muted-foreground italic">{t("indicativeValueNote")}</p>
  </CardContent>
</Card>
```

3. Add inquiry note card before the submit button (before `{error && ...}`):
```tsx
<Card className="bg-muted/50">
  <CardContent className="pt-4 pb-4">
    <p className="text-sm text-muted-foreground">{t("inquiryNote")}</p>
  </CardContent>
</Card>
```

- [ ] **Step 2: Update cart-view.tsx**

Update the `CardFooter` to show indicative value instead of plain total:

Replace (line 57-60):
```tsx
<CardFooter className="flex justify-between">
  <p className="font-semibold">
    {t("total")}: {group.total.toFixed(2)} zl
  </p>
```

With:
```tsx
<CardFooter className="flex justify-between items-end">
  <div>
    <p className="font-semibold text-sm">{t("indicativeValue")}: {group.total.toFixed(2)} zł</p>
    <p className="text-xs text-muted-foreground">{t("indicativeValueNote")}</p>
  </div>
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/components/checkout/ src/domains/orders/components/cart/
git commit -m "feat(dac7): show indicative value with disclaimer in cart and checkout"
```

---

### Task 12: Delete payment components

**Files:**
- Delete: `src/domains/orders/components/order-detail/payment-proof-form.tsx`
- Delete: `src/domains/orders/components/farmer-dashboard/payment-methods-form.tsx`

- [ ] **Step 1: Delete files**

```bash
rm src/domains/orders/components/order-detail/payment-proof-form.tsx
rm src/domains/orders/components/farmer-dashboard/payment-methods-form.tsx
```

- [ ] **Step 2: Commit**

```bash
git add -A src/domains/orders/components/
git commit -m "feat(dac7): delete payment proof and payment methods components"
```

---

### Task 13: Update i18n translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add new keys under `orders`**

Add inside the `"orders"` object:
```json
"indicativeValue": "Orientacyjna wartość",
"indicativeValueNote": "Kwota do ustalenia bezpośrednio z rolnikiem",
"indicativeDeliveryCost": "Orientacyjny koszt dostawy",
"inquiryNote": "Szczegóły płatności i dostawy ustalisz bezpośrednio z rolnikiem po złożeniu zapytania."
```

- [ ] **Step 2: Remove payment-related keys from `orders`**

Remove these keys:
- `payment`, `paymentMethod`, `paymentMethodBlik`, `paymentMethodTransfer`, `paymentMethodCrypto`, `paymentMethodCashOnPickup`
- `paymentPrepaid`, `paymentOnPickup`
- `paymentProof`, `submitProof`
- `proofScreenshot`, `proofBankTransfer`, `proofBlockchain`
- `verifyPayment`, `paymentVerified`, `paymentPending`
- `paymentMethods`, `addPaymentMethod`, `editPaymentMethod`
- `paymentLabel`, `paymentDetails`, `setAsDefault`
- `farmerPaymentMethodsLabel`
- `imageUrl`, `imageUrlHint`, `transactionUrl`, `proofTypeLabel`
- `paymentReminder`, `paymentType`, `defaultMethod`
- `statusPaid`
- `shippingCost`
- `modifyHint` (update text): `"Modyfikuj ilości pozycji zapytania. Po zapisaniu klient zobaczy zmiany i będzie musiał je zaakceptować."`

- [ ] **Step 3: Commit**

```bash
git add messages/pl.json
git commit -m "feat(dac7): update i18n — add indicative value keys, remove payment keys"
```

---

### Task 14: Verify build compiles cleanly

- [ ] **Step 1: Run TypeScript check**

```bash
cd D:/plonbli
npx tsc --noEmit
```

Expected: 0 errors. If errors appear, fix TypeScript type mismatches (most likely: remaining references to removed columns or types).

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass. If any test references removed payment types/fields, update the test mocks accordingly.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(dac7): resolve TypeScript errors after payment removal"
```
