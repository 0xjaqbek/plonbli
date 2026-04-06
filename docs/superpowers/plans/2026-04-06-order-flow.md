# Order Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete order system — from cart through payment verification and delivery tracking — enabling farmers and consumers to coordinate purchases with off-platform payments.

**Architecture:** New `src/domains/orders/` domain following existing domain-driven patterns. DB schemas in `src/shared/db/schema/`, server actions with auth+Zod validation, queries with typed returns. Cart stored in DB (per user, grouped by farmer via listing→product→farmer relation). Order status machine with defined transitions. Payment proofs stored as screenshots (Cloudflare R2) or blockchain links.

**Tech Stack:** Drizzle ORM (PostgreSQL), Zod validation, Next.js 15 Server Actions + Server Components, shadcn/ui + Tailwind CSS, next-intl (Polish), Vitest

**Spec:** `docs/superpowers/specs/2026-04-05-order-flow-design.md`

---

## File Structure

### DB Schema (src/shared/db/schema/)
- **Create:** `orders.ts` — orders table, order_items table, order_status_history table, enums (orderStatus, deliveryMethod, paymentMethod, paymentRequired, cancelledBy)
- **Create:** `payments.ts` — payment_proofs table, farmer_payment_methods table, enums (paymentProofType, farmerPaymentType)
- **Create:** `pickup-slots.ts` — pickup_slots table
- **Create:** `cart-items.ts` — cart_items table
- **Modify:** `index.ts` — add exports for all new schemas
- **Modify:** `relations.ts` — add relations for all new tables

### Domain (src/domains/orders/)
- **Create:** `schemas/validation.ts` — Zod schemas for cart, order creation, modification, payment proof, pickup slots, farmer payment methods
- **Create:** `actions/add-to-cart.ts`
- **Create:** `actions/update-cart-item.ts`
- **Create:** `actions/remove-from-cart.ts`
- **Create:** `actions/create-order.ts`
- **Create:** `actions/modify-order.ts`
- **Create:** `actions/accept-modification.ts`
- **Create:** `actions/confirm-order.ts`
- **Create:** `actions/submit-payment-proof.ts`
- **Create:** `actions/verify-payment.ts`
- **Create:** `actions/update-order-status.ts`
- **Create:** `actions/complete-order.ts`
- **Create:** `actions/cancel-order.ts`
- **Create:** `actions/manage-payment-methods.ts`
- **Create:** `actions/manage-pickup-slots.ts`
- **Create:** `queries/get-cart.ts`
- **Create:** `queries/get-order.ts`
- **Create:** `queries/get-customer-orders.ts`
- **Create:** `queries/get-farmer-orders.ts`
- **Create:** `queries/get-farmer-payment-methods.ts`
- **Create:** `queries/get-pickup-slots.ts`
- **Create:** `components/cart/cart-view.tsx`
- **Create:** `components/cart/cart-item-row.tsx`
- **Create:** `components/checkout/checkout-form.tsx`
- **Create:** `components/order-list/order-list.tsx`
- **Create:** `components/order-list/order-card.tsx`
- **Create:** `components/order-detail/order-detail.tsx`
- **Create:** `components/order-detail/order-timeline.tsx`
- **Create:** `components/order-detail/order-items-table.tsx`
- **Create:** `components/order-detail/payment-proof-form.tsx`
- **Create:** `components/order-detail/modification-review.tsx`
- **Create:** `components/farmer-dashboard/farmer-order-list.tsx`
- **Create:** `components/farmer-dashboard/farmer-order-detail.tsx`
- **Create:** `components/farmer-dashboard/payment-methods-form.tsx`
- **Create:** `components/farmer-dashboard/pickup-schedule-form.tsx`
- **Create:** `types/index.ts`
- **Create:** `index.ts` — barrel export

### App Routes (src/app/[locale]/(main)/)
- **Create:** `marketplace/cart/page.tsx`
- **Create:** `marketplace/cart/[farmerId]/checkout/page.tsx`
- **Create:** `orders/page.tsx`
- **Create:** `orders/[id]/page.tsx`
- **Create:** `farmer/orders/page.tsx`
- **Create:** `farmer/orders/[id]/page.tsx`
- **Create:** `farmer/settings/payments/page.tsx`
- **Create:** `farmer/settings/pickup-schedule/page.tsx`

### Product detail integration
- **Modify:** `src/domains/marketplace/components/product-detail.tsx` — add "Dodaj do koszyka" button

### Navigation
- **Modify:** `src/shared/ui/nav-bar.tsx` — add cart icon with badge, orders link

### i18n
- **Modify:** `messages/pl.json` — add orders namespace

### Tests (tests/domains/orders/)
- **Create:** `schemas/validation.test.ts`
- **Create:** `actions/cart.test.ts`
- **Create:** `actions/create-order.test.ts`
- **Create:** `actions/modify-order.test.ts`
- **Create:** `actions/order-status.test.ts`
- **Create:** `actions/payment.test.ts`
- **Create:** `actions/cancel-order.test.ts`

---

## Task 1: DB Schema — Order Enums and Tables

**Files:**
- Create: `src/shared/db/schema/orders.ts`
- Test: `tests/domains/orders/schemas/validation.test.ts` (placeholder for later)

- [ ] **Step 1: Create order schema file with enums**

```typescript
// src/shared/db/schema/orders.ts
import { pgTable, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "MODIFIED",
  "CONFIRMED",
  "PAID",
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

export const paymentMethodEnum = pgEnum("payment_method", [
  "BLIK",
  "TRANSFER",
  "CRYPTO",
  "CASH_ON_PICKUP",
]);

export const paymentRequiredEnum = pgEnum("payment_required", [
  "PREPAID",
  "ON_PICKUP",
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
  shippingCost: numeric("shipping_cost", { precision: 10, scale: 2 }),
  trackingNumber: text("tracking_number"),
  trackingUrl: text("tracking_url"),
  paymentMethod: paymentMethodEnum("payment_method"),
  paymentRequired: paymentRequiredEnum("payment_required"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  customerNote: text("customer_note"),
  farmerNote: text("farmer_note"),
  cancellationReason: text("cancellation_reason"),
  cancelledBy: cancelledByEnum("cancelled_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
```

- [ ] **Step 2: Add order_items table to the same file**

Append to `src/shared/db/schema/orders.ts`:

```typescript
import { listings } from "./listings";

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  listingId: text("listing_id").notNull().references(() => listings.id),
  productName: text("product_name").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  modifiedQuantity: numeric("modified_quantity", { precision: 10, scale: 2 }),
  modifiedPricePerUnit: numeric("modified_price_per_unit", { precision: 10, scale: 2 }),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
```

- [ ] **Step 3: Add order_status_history table**

Append to `src/shared/db/schema/orders.ts`:

```typescript
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

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/orders.ts
git commit -m "feat(orders): add order, order_items, order_status_history schemas"
```

---

## Task 2: DB Schema — Payments, Pickup Slots, Cart

**Files:**
- Create: `src/shared/db/schema/payments.ts`
- Create: `src/shared/db/schema/pickup-slots.ts`
- Create: `src/shared/db/schema/cart-items.ts`

- [ ] **Step 1: Create payments schema**

```typescript
// src/shared/db/schema/payments.ts
import { pgTable, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { orders } from "./orders";

export const paymentProofTypeEnum = pgEnum("payment_proof_type", [
  "SCREENSHOT",
  "BANK_TRANSFER",
  "BLOCKCHAIN_LINK",
]);

export const farmerPaymentTypeEnum = pgEnum("farmer_payment_type", [
  "BLIK",
  "TRANSFER",
  "CRYPTO",
]);

export const paymentProofs = pgTable("payment_proofs", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  type: paymentProofTypeEnum("type").notNull(),
  imageUrl: text("image_url"),
  transactionUrl: text("transaction_url"),
  description: text("description"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PaymentProof = typeof paymentProofs.$inferSelect;
export type NewPaymentProof = typeof paymentProofs.$inferInsert;

export const farmerPaymentMethods = pgTable("farmer_payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  farmerId: text("farmer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: farmerPaymentTypeEnum("type").notNull(),
  label: text("label").notNull(),
  details: text("details").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FarmerPaymentMethod = typeof farmerPaymentMethods.$inferSelect;
export type NewFarmerPaymentMethod = typeof farmerPaymentMethods.$inferInsert;
```

- [ ] **Step 2: Create pickup-slots schema**

```typescript
// src/shared/db/schema/pickup-slots.ts
import { pgTable, text, integer, date, time, boolean, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { orders } from "./orders";

export const pickupSlots = pgTable("pickup_slots", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  farmerId: text("farmer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week"),
  specificDate: date("specific_date"),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PickupSlot = typeof pickupSlots.$inferSelect;
export type NewPickupSlot = typeof pickupSlots.$inferInsert;
```

- [ ] **Step 3: Create cart-items schema**

```typescript
// src/shared/db/schema/cart-items.ts
import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { listings } from "./listings";

export const cartItems = pgTable("cart_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  listingId: text("listing_id").notNull().references(() => listings.id, { onDelete: "cascade" }),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type CartItem = typeof cartItems.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/payments.ts src/shared/db/schema/pickup-slots.ts src/shared/db/schema/cart-items.ts
git commit -m "feat(orders): add payments, pickup_slots, cart_items schemas"
```

---

## Task 3: DB Schema — Relations and Exports

**Files:**
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Add relations for order tables**

Add to `src/shared/db/schema/relations.ts`:

```typescript
import { orders, orderItems, orderStatusHistory } from "./orders";
import { paymentProofs, farmerPaymentMethods } from "./payments";
import { pickupSlots } from "./pickup-slots";
import { cartItems } from "./cart-items";

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id], relationName: "customerOrders" }),
  farmer: one(users, { fields: [orders.farmerId], references: [users.id], relationName: "farmerOrders" }),
  pickupSlot: one(pickupSlots, { fields: [orders.pickupSlotId], references: [pickupSlots.id] }),
  items: many(orderItems),
  statusHistory: many(orderStatusHistory),
  paymentProofs: many(paymentProofs),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  listing: one(listings, { fields: [orderItems.listingId], references: [listings.id] }),
}));

export const orderStatusHistoryRelations = relations(orderStatusHistory, ({ one }) => ({
  order: one(orders, { fields: [orderStatusHistory.orderId], references: [orders.id] }),
  createdByUser: one(users, { fields: [orderStatusHistory.createdBy], references: [users.id] }),
}));

export const paymentProofsRelations = relations(paymentProofs, ({ one }) => ({
  order: one(orders, { fields: [paymentProofs.orderId], references: [orders.id] }),
}));

export const farmerPaymentMethodsRelations = relations(farmerPaymentMethods, ({ one }) => ({
  farmer: one(users, { fields: [farmerPaymentMethods.farmerId], references: [users.id] }),
}));

export const pickupSlotsRelations = relations(pickupSlots, ({ one }) => ({
  farmer: one(users, { fields: [pickupSlots.farmerId], references: [users.id] }),
  order: one(orders, { fields: [pickupSlots.orderId], references: [orders.id] }),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  listing: one(listings, { fields: [cartItems.listingId], references: [listings.id] }),
}));
```

- [ ] **Step 2: Export all new schemas from index.ts**

Add to `src/shared/db/schema/index.ts`:

```typescript
// Orders
export {
  orders, orderItems, orderStatusHistory,
  orderStatusEnum, deliveryMethodEnum, paymentMethodEnum, paymentRequiredEnum, cancelledByEnum,
  type Order, type NewOrder, type OrderItem, type NewOrderItem,
  type OrderStatusHistory, type NewOrderStatusHistory,
} from "./orders";

// Payments
export {
  paymentProofs, farmerPaymentMethods,
  paymentProofTypeEnum, farmerPaymentTypeEnum,
  type PaymentProof, type NewPaymentProof,
  type FarmerPaymentMethod, type NewFarmerPaymentMethod,
} from "./payments";

// Pickup Slots
export {
  pickupSlots,
  type PickupSlot, type NewPickupSlot,
} from "./pickup-slots";

// Cart
export {
  cartItems,
  type CartItem, type NewCartItem,
} from "./cart-items";

// Relations (add new ones)
export {
  ordersRelations, orderItemsRelations, orderStatusHistoryRelations,
  paymentProofsRelations, farmerPaymentMethodsRelations,
  pickupSlotsRelations, cartItemsRelations,
} from "./relations";
```

- [ ] **Step 3: Generate and apply migration**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/relations.ts src/shared/db/schema/index.ts drizzle/
git commit -m "feat(orders): add relations and schema exports, generate migration"
```

---

## Task 4: Zod Validation Schemas

**Files:**
- Create: `src/domains/orders/schemas/validation.ts`
- Test: `tests/domains/orders/schemas/validation.test.ts`

- [ ] **Step 1: Write validation schema tests**

```typescript
// tests/domains/orders/schemas/validation.test.ts
import { describe, it, expect } from "vitest";
import {
  addToCartSchema,
  createOrderSchema,
  modifyOrderSchema,
  submitPaymentProofSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  shippingInfoSchema,
  farmerPaymentMethodSchema,
  pickupSlotSchema,
} from "@/domains/orders/schemas/validation";

describe("addToCartSchema", () => {
  it("accepts valid input", () => {
    const result = addToCartSchema.safeParse({ listingId: "abc123", quantity: 5 });
    expect(result.success).toBe(true);
  });

  it("rejects zero quantity", () => {
    const result = addToCartSchema.safeParse({ listingId: "abc123", quantity: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects missing listingId", () => {
    const result = addToCartSchema.safeParse({ quantity: 5 });
    expect(result.success).toBe(false);
  });
});

describe("createOrderSchema", () => {
  it("accepts pickup order", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts delivery order with address", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "DELIVERY",
      deliveryAddress: "ul. Polna 1, Warszawa",
    });
    expect(result.success).toBe(true);
  });

  it("rejects delivery without address", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "DELIVERY",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional customerNote", () => {
    const result = createOrderSchema.safeParse({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
      customerNote: "Prosze o wieksze pomidory",
    });
    expect(result.success).toBe(true);
  });
});

describe("modifyOrderSchema", () => {
  it("accepts item modifications", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
      items: [{ orderItemId: "item-1", modifiedQuantity: 3, modifiedPricePerUnit: 10 }],
      paymentRequired: "PREPAID",
    });
    expect(result.success).toBe(true);
  });

  it("accepts shipping cost change", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
      shippingCost: 15,
      paymentRequired: "ON_PICKUP",
    });
    expect(result.success).toBe(true);
  });

  it("requires paymentRequired", () => {
    const result = modifyOrderSchema.safeParse({
      orderId: "order-1",
    });
    expect(result.success).toBe(false);
  });
});

describe("submitPaymentProofSchema", () => {
  it("accepts screenshot proof", () => {
    const result = submitPaymentProofSchema.safeParse({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts blockchain link proof", () => {
    const result = submitPaymentProofSchema.safeParse({
      orderId: "order-1",
      type: "BLOCKCHAIN_LINK",
      transactionUrl: "https://etherscan.io/tx/0x123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects screenshot without imageUrl", () => {
    const result = submitPaymentProofSchema.safeParse({
      orderId: "order-1",
      type: "SCREENSHOT",
    });
    expect(result.success).toBe(false);
  });
});

describe("cancelOrderSchema", () => {
  it("accepts cancellation with reason", () => {
    const result = cancelOrderSchema.safeParse({
      orderId: "order-1",
      reason: "Zmiana planow",
    });
    expect(result.success).toBe(true);
  });

  it("accepts cancellation without reason", () => {
    const result = cancelOrderSchema.safeParse({ orderId: "order-1" });
    expect(result.success).toBe(true);
  });
});

describe("shippingInfoSchema", () => {
  it("accepts tracking number with url", () => {
    const result = shippingInfoSchema.safeParse({
      orderId: "order-1",
      trackingNumber: "PL123456789",
      trackingUrl: "https://tracking.poczta-polska.pl/PL123456789",
    });
    expect(result.success).toBe(true);
  });

  it("requires tracking number", () => {
    const result = shippingInfoSchema.safeParse({ orderId: "order-1" });
    expect(result.success).toBe(false);
  });

  it("trackingUrl is optional", () => {
    const result = shippingInfoSchema.safeParse({
      orderId: "order-1",
      trackingNumber: "PL123456789",
    });
    expect(result.success).toBe(true);
  });
});

describe("farmerPaymentMethodSchema", () => {
  it("accepts valid payment method", () => {
    const result = farmerPaymentMethodSchema.safeParse({
      type: "BLIK",
      label: "BLIK na telefon",
      details: "600 123 456",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty details", () => {
    const result = farmerPaymentMethodSchema.safeParse({
      type: "TRANSFER",
      label: "Przelew",
      details: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("pickupSlotSchema", () => {
  it("accepts global weekly slot", () => {
    const result = pickupSlotSchema.safeParse({
      dayOfWeek: 2,
      startTime: "14:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts specific date slot", () => {
    const result = pickupSlotSchema.safeParse({
      specificDate: "2026-04-10",
      startTime: "10:00",
      endTime: "12:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects dayOfWeek out of range", () => {
    const result = pickupSlotSchema.safeParse({
      dayOfWeek: 7,
      startTime: "14:00",
      endTime: "18:00",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/orders/schemas/validation.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement validation schemas**

```typescript
// src/domains/orders/schemas/validation.ts
import { z } from "zod";

export const addToCartSchema = z.object({
  listingId: z.string().min(1),
  quantity: z.coerce.number().positive("Ilosc musi byc wieksza od 0"),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const createOrderSchema = z.object({
  farmerId: z.string().min(1),
  deliveryMethod: z.enum(["PICKUP", "DELIVERY", "DROP_POINT"]),
  deliveryAddress: z.string().optional(),
  pickupSlotId: z.string().optional(),
  customerNote: z.string().max(2000).optional(),
}).refine(
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
  modifiedPricePerUnit: z.coerce.number().nonnegative().optional(),
});

export const modifyOrderSchema = z.object({
  orderId: z.string().min(1),
  items: z.array(modifyItemSchema).optional(),
  shippingCost: z.coerce.number().nonnegative().optional(),
  paymentRequired: z.enum(["PREPAID", "ON_PICKUP"]),
  farmerNote: z.string().max(2000).optional(),
  pickupSlotIds: z.array(z.string()).optional(),
});

export type ModifyOrderInput = z.infer<typeof modifyOrderSchema>;

export const submitPaymentProofSchema = z.object({
  orderId: z.string().min(1),
  type: z.enum(["SCREENSHOT", "BANK_TRANSFER", "BLOCKCHAIN_LINK"]),
  imageUrl: z.string().url().optional(),
  transactionUrl: z.string().url().optional(),
  description: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.type === "SCREENSHOT") return !!data.imageUrl;
    if (data.type === "BLOCKCHAIN_LINK") return !!data.transactionUrl;
    if (data.type === "BANK_TRANSFER") return !!data.imageUrl || !!data.transactionUrl;
    return true;
  },
  { message: "Wymagany dowod platnosci", path: ["imageUrl"] },
);

export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;

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

export const farmerPaymentMethodSchema = z.object({
  type: z.enum(["BLIK", "TRANSFER", "CRYPTO"]),
  label: z.string().min(1).max(100),
  details: z.string().min(1).max(500),
  isDefault: z.boolean().optional(),
});

export type FarmerPaymentMethodInput = z.infer<typeof farmerPaymentMethodSchema>;

export const pickupSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  specificDate: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Format HH:MM"),
}).refine(
  (data) => data.dayOfWeek !== undefined || data.specificDate !== undefined,
  { message: "Wymagany dzien tygodnia lub konkretna data" },
);

export type PickupSlotInput = z.infer<typeof pickupSlotSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/orders/schemas/validation.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/orders/schemas/validation.ts tests/domains/orders/schemas/validation.test.ts
git commit -m "feat(orders): add Zod validation schemas with tests"
```

---

## Task 5: Cart Actions

**Files:**
- Create: `src/domains/orders/actions/add-to-cart.ts`
- Create: `src/domains/orders/actions/update-cart-item.ts`
- Create: `src/domains/orders/actions/remove-from-cart.ts`
- Test: `tests/domains/orders/actions/cart.test.ts`

- [ ] **Step 1: Write cart action tests**

```typescript
// tests/domains/orders/actions/cart.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { addToCart } from "@/domains/orders/actions/add-to-cart";
import { updateCartItem } from "@/domains/orders/actions/update-cart-item";
import { removeFromCart } from "@/domains/orders/actions/remove-from-cart";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    update: vi.fn().mockReturnValue({ set: mockSet }),
    delete: vi.fn().mockReturnValue({ where: mockWhere }),
    query: {
      listings: { findFirst: vi.fn() },
      cartItems: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("addToCart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await addToCart({ listingId: "list-1", quantity: 2 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error for invalid quantity", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await addToCart({ listingId: "list-1", quantity: -1 });
    expect(result.success).toBe(false);
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined);

    const result = await addToCart({ listingId: "list-1", quantity: 2 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Oferta nie istnieje");
  });

  it("adds item to cart on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "list-1",
      availability: "AVAILABLE",
    } as any);
    vi.mocked(db.query.cartItems.findFirst).mockResolvedValueOnce(undefined);
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "cart-1" }]);
    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({ returning: mockReturning }),
    } as any);

    const result = await addToCart({ listingId: "list-1", quantity: 2 });
    expect(result.success).toBe(true);
  });
});

describe("updateCartItem", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateCartItem("cart-1", 5);
    expect(result.success).toBe(false);
  });
});

describe("removeFromCart", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await removeFromCart("cart-1");
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/orders/actions/cart.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 3: Implement addToCart**

```typescript
// src/domains/orders/actions/add-to-cart.ts
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { addToCartSchema, type AddToCartInput } from "../schemas/validation";

type AddToCartResult =
  | { success: true; cartItemId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function addToCart(input: AddToCartInput): Promise<AddToCartResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = addToCartSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { listingId, quantity } = parsed.data;

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
  });

  if (!listing || listing.availability === "OUT_OF_STOCK") {
    return { success: false, error: "Oferta nie istnieje" };
  }

  // Check if already in cart — update quantity instead
  const existing = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.userId, session.user.id), eq(cartItems.listingId, listingId)),
  });

  if (existing) {
    const newQuantity = Number(existing.quantity) + quantity;
    await db
      .update(cartItems)
      .set({ quantity: String(newQuantity) })
      .where(eq(cartItems.id, existing.id));
    return { success: true, cartItemId: existing.id };
  }

  const [item] = await db
    .insert(cartItems)
    .values({
      userId: session.user.id,
      listingId,
      quantity: String(quantity),
    })
    .returning({ id: cartItems.id });

  return { success: true, cartItemId: item.id };
}
```

- [ ] **Step 4: Implement updateCartItem**

```typescript
// src/domains/orders/actions/update-cart-item.ts
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type UpdateCartResult = { success: true } | { success: false; error: string };

export async function updateCartItem(cartItemId: string, quantity: number): Promise<UpdateCartResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  if (quantity <= 0) {
    return { success: false, error: "Ilosc musi byc wieksza od 0" };
  }

  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, cartItemId), eq(cartItems.userId, session.user.id)),
  });

  if (!item) {
    return { success: false, error: "Nie znaleziono pozycji" };
  }

  await db
    .update(cartItems)
    .set({ quantity: String(quantity) })
    .where(eq(cartItems.id, cartItemId));

  return { success: true };
}
```

- [ ] **Step 5: Implement removeFromCart**

```typescript
// src/domains/orders/actions/remove-from-cart.ts
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type RemoveCartResult = { success: true } | { success: false; error: string };

export async function removeFromCart(cartItemId: string): Promise<RemoveCartResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const item = await db.query.cartItems.findFirst({
    where: and(eq(cartItems.id, cartItemId), eq(cartItems.userId, session.user.id)),
  });

  if (!item) {
    return { success: false, error: "Nie znaleziono pozycji" };
  }

  await db.delete(cartItems).where(eq(cartItems.id, cartItemId));

  return { success: true };
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/domains/orders/actions/cart.test.ts
```

Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/domains/orders/actions/add-to-cart.ts src/domains/orders/actions/update-cart-item.ts src/domains/orders/actions/remove-from-cart.ts tests/domains/orders/actions/cart.test.ts
git commit -m "feat(orders): add cart actions with tests"
```

---

## Task 6: Create Order Action

**Files:**
- Create: `src/domains/orders/actions/create-order.ts`
- Test: `tests/domains/orders/actions/create-order.test.ts`

- [ ] **Step 1: Write create order tests**

```typescript
// tests/domains/orders/actions/create-order.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder } from "@/domains/orders/actions/create-order";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn(),
          }),
        }),
      }),
    }),
    query: {
      cartItems: { findMany: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("createOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error when cart is empty", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      }),
    } as any);

    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
      pickupSlotId: "slot-1",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Koszyk jest pusty");
  });

  it("returns error for delivery without address", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "DELIVERY",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/orders/actions/create-order.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement createOrder**

```typescript
// src/domains/orders/actions/create-order.ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/orders/actions/create-order.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/orders/actions/create-order.ts tests/domains/orders/actions/create-order.test.ts
git commit -m "feat(orders): add create order action with tests"
```

---

## Task 7: Modify Order and Accept Modification Actions

**Files:**
- Create: `src/domains/orders/actions/modify-order.ts`
- Create: `src/domains/orders/actions/accept-modification.ts`
- Create: `src/domains/orders/actions/confirm-order.ts`
- Test: `tests/domains/orders/actions/modify-order.test.ts`

- [ ] **Step 1: Write modify order tests**

```typescript
// tests/domains/orders/actions/modify-order.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { modifyOrder } from "@/domains/orders/actions/modify-order";
import { acceptModification } from "@/domains/orders/actions/accept-modification";
import { confirmOrder } from "@/domains/orders/actions/confirm-order";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
      orderItems: { findMany: vi.fn() },
      listings: { findFirst: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("modifyOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await modifyOrder({
      orderId: "order-1",
      paymentRequired: "PREPAID",
    });
    expect(result.success).toBe(false);
  });

  it("returns error when order not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce(undefined);

    const result = await modifyOrder({
      orderId: "order-1",
      paymentRequired: "PREPAID",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Zamowienie nie istnieje");
  });

  it("returns error when user is not the farmer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "PENDING",
    } as any);

    const result = await modifyOrder({
      orderId: "order-1",
      paymentRequired: "PREPAID",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("returns error when order is not in PENDING status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await modifyOrder({
      orderId: "order-1",
      paymentRequired: "PREPAID",
    });
    expect(result.success).toBe(false);
  });
});

describe("confirmOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await confirmOrder("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when order not in PENDING status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "COMPLETED",
    } as any);

    const result = await confirmOrder("order-1");
    expect(result.success).toBe(false);
  });
});

describe("acceptModification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await acceptModification("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when order not in MODIFIED status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "PENDING",
    } as any);

    const result = await acceptModification("order-1");
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/orders/actions/modify-order.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 3: Implement modifyOrder**

```typescript
// src/domains/orders/actions/modify-order.ts
"use server";

import { eq } from "drizzle-orm";
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

  const { orderId, items, shippingCost, paymentRequired, farmerNote } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "PENDING") {
    return { success: false, error: "Zamowienie nie moze byc zmodyfikowane w tym statusie" };
  }

  await db.transaction(async (tx) => {
    // Update item modifications
    if (items?.length) {
      for (const item of items) {
        await tx
          .update(orderItems)
          .set({
            modifiedQuantity: item.modifiedQuantity !== undefined ? String(item.modifiedQuantity) : null,
            modifiedPricePerUnit: item.modifiedPricePerUnit !== undefined ? String(item.modifiedPricePerUnit) : null,
          })
          .where(eq(orderItems.id, item.orderItemId));
      }
    }

    // Recalculate total
    const allItems = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    let newTotal = 0;
    for (const item of allItems) {
      const qty = item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
      const price = item.modifiedPricePerUnit ? Number(item.modifiedPricePerUnit) : Number(item.pricePerUnit);
      newTotal += qty * price;
    }

    if (shippingCost !== undefined) {
      newTotal += shippingCost;
    } else if (order.shippingCost) {
      newTotal += Number(order.shippingCost);
    }

    // Update order
    await tx
      .update(orders)
      .set({
        status: "MODIFIED",
        shippingCost: shippingCost !== undefined ? String(shippingCost) : order.shippingCost,
        paymentRequired: paymentRequired as "PREPAID" | "ON_PICKUP",
        farmerNote: farmerNote ?? order.farmerNote,
        totalAmount: String(newTotal),
      })
      .where(eq(orders.id, orderId));

    // Record status change
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

- [ ] **Step 4: Implement confirmOrder**

```typescript
// src/domains/orders/actions/confirm-order.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type ConfirmOrderResult = { success: true } | { success: false; error: string };

export async function confirmOrder(orderId: string): Promise<ConfirmOrderResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "PENDING") {
    return { success: false, error: "Zamowienie nie moze byc potwierdzone w tym statusie" };
  }

  await db.transaction(async (tx) => {
    // Reserve quantities
    const items = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    for (const item of items) {
      const listing = await tx.query.listings.findFirst({
        where: eq(listings.id, item.listingId),
      });

      if (listing?.quantityAvailable) {
        const qty = item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
        const newAvailable = Number(listing.quantityAvailable) - qty;
        await tx
          .update(listings)
          .set({ quantityAvailable: String(Math.max(0, newAvailable)) })
          .where(eq(listings.id, item.listingId));
      }
    }

    await tx
      .update(orders)
      .set({ status: "CONFIRMED" })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "CONFIRMED",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
```

- [ ] **Step 5: Implement acceptModification**

```typescript
// src/domains/orders/actions/accept-modification.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type AcceptModificationResult = { success: true } | { success: false; error: string };

export async function acceptModification(orderId: string): Promise<AcceptModificationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.customerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "MODIFIED") {
    return { success: false, error: "Zamowienie nie jest w statusie do akceptacji" };
  }

  await db.transaction(async (tx) => {
    // Reserve quantities (same as confirmOrder)
    const items = await tx.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    for (const item of items) {
      const listing = await tx.query.listings.findFirst({
        where: eq(listings.id, item.listingId),
      });

      if (listing?.quantityAvailable) {
        const qty = item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
        const newAvailable = Number(listing.quantityAvailable) - qty;
        await tx
          .update(listings)
          .set({ quantityAvailable: String(Math.max(0, newAvailable)) })
          .where(eq(listings.id, item.listingId));
      }
    }

    await tx
      .update(orders)
      .set({ status: "CONFIRMED" })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "CONFIRMED",
      note: "Klient zaakceptowal modyfikacje",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/domains/orders/actions/modify-order.test.ts
```

Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add src/domains/orders/actions/modify-order.ts src/domains/orders/actions/confirm-order.ts src/domains/orders/actions/accept-modification.ts tests/domains/orders/actions/modify-order.test.ts
git commit -m "feat(orders): add modify, confirm, accept modification actions with tests"
```

---

## Task 8: Payment and Order Status Actions

**Files:**
- Create: `src/domains/orders/actions/submit-payment-proof.ts`
- Create: `src/domains/orders/actions/verify-payment.ts`
- Create: `src/domains/orders/actions/update-order-status.ts`
- Create: `src/domains/orders/actions/complete-order.ts`
- Test: `tests/domains/orders/actions/order-status.test.ts`
- Test: `tests/domains/orders/actions/payment.test.ts`

- [ ] **Step 1: Write payment tests**

```typescript
// tests/domains/orders/actions/payment.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitPaymentProof } from "@/domains/orders/actions/submit-payment-proof";
import { verifyPayment } from "@/domains/orders/actions/verify-payment";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn() }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
      paymentProofs: { findFirst: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("submitPaymentProof", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await submitPaymentProof({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(false);
  });

  it("returns error when order not in CONFIRMED status", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "PENDING",
    } as any);

    const result = await submitPaymentProof({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(false);
  });

  it("returns error when not the customer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "CONFIRMED",
    } as any);

    const result = await submitPaymentProof({
      orderId: "order-1",
      type: "SCREENSHOT",
      imageUrl: "https://r2.example.com/proof.png",
    });
    expect(result.success).toBe(false);
  });
});

describe("verifyPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not the farmer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await verifyPayment("order-1", "proof-1");
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Write order status tests**

```typescript
// tests/domains/orders/actions/order-status.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateOrderStatus } from "@/domains/orders/actions/update-order-status";
import { completeOrder } from "@/domains/orders/actions/complete-order";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn() }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn() }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("updateOrderStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateOrderStatus({
      orderId: "order-1",
      status: "PREPARING",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status transition", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      farmerId: "farmer-1",
      status: "PENDING",
    } as any);

    const result = await updateOrderStatus({
      orderId: "order-1",
      status: "PREPARING",
    });
    expect(result.success).toBe(false);
  });
});

describe("completeOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not the customer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      status: "SHIPPED",
    } as any);

    const result = await completeOrder("order-1");
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/domains/orders/actions/payment.test.ts tests/domains/orders/actions/order-status.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 4: Implement submitPaymentProof**

```typescript
// src/domains/orders/actions/submit-payment-proof.ts
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

  return { success: true, proofId: proof.id };
}
```

- [ ] **Step 5: Implement verifyPayment**

```typescript
// src/domains/orders/actions/verify-payment.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderStatusHistory, paymentProofs } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type VerifyPaymentResult = { success: true } | { success: false; error: string };

export async function verifyPayment(orderId: string, proofId: string): Promise<VerifyPaymentResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "CONFIRMED") {
    return { success: false, error: "Nie mozna potwierdzic platnosci w tym statusie" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(paymentProofs)
      .set({ verified: true })
      .where(eq(paymentProofs.id, proofId));

    await tx
      .update(orders)
      .set({ status: "PAID" })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "PAID",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
```

- [ ] **Step 6: Implement updateOrderStatus**

```typescript
// src/domains/orders/actions/update-order-status.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderStatusHistory } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { updateOrderStatusSchema, shippingInfoSchema, type UpdateOrderStatusInput, type ShippingInfoInput } from "../schemas/validation";

type StatusResult = { success: true } | { success: false; error?: string; errors?: Record<string, string[]> };

// Valid transitions for farmer-initiated status changes
const validTransitions: Record<string, string[]> = {
  PAID: ["PREPARING", "READY_FOR_PICKUP"],
  CONFIRMED: ["PREPARING", "READY_FOR_PICKUP"], // on_pickup flow skips PAID
  PREPARING: ["SHIPPED", "READY_FOR_PICKUP"],
};

export async function updateOrderStatus(input: UpdateOrderStatusInput): Promise<StatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = updateOrderStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, status, note } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  const allowed = validTransitions[order.status] ?? [];
  if (!allowed.includes(status)) {
    return { success: false, error: `Nie mozna zmienic statusu z ${order.status} na ${status}` };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: status as any })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: status as any,
      note: note ?? null,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}

export async function markAsShipped(input: ShippingInfoInput): Promise<StatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = shippingInfoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, trackingNumber, trackingUrl } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (order.status !== "PREPARING") {
    return { success: false, error: "Zamowienie nie jest w przygotowaniu" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "SHIPPED",
        trackingNumber,
        trackingUrl: trackingUrl ?? null,
      })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "SHIPPED",
      note: `Numer przesylki: ${trackingNumber}`,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
```

- [ ] **Step 7: Implement completeOrder**

```typescript
// src/domains/orders/actions/complete-order.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderStatusHistory } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type CompleteResult = { success: true } | { success: false; error: string };

export async function completeOrder(orderId: string): Promise<CompleteResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  if (order.customerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  const completableStatuses = ["SHIPPED", "READY_FOR_PICKUP"];
  if (!completableStatuses.includes(order.status)) {
    return { success: false, error: "Nie mozna potwierdzic odbioru w tym statusie" };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ status: "COMPLETED" })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "COMPLETED",
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run tests/domains/orders/actions/payment.test.ts tests/domains/orders/actions/order-status.test.ts
```

Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/domains/orders/actions/submit-payment-proof.ts src/domains/orders/actions/verify-payment.ts src/domains/orders/actions/update-order-status.ts src/domains/orders/actions/complete-order.ts tests/domains/orders/actions/payment.test.ts tests/domains/orders/actions/order-status.test.ts
git commit -m "feat(orders): add payment proof, verify payment, status updates, complete order actions with tests"
```

---

## Task 9: Cancel Order Action

**Files:**
- Create: `src/domains/orders/actions/cancel-order.ts`
- Test: `tests/domains/orders/actions/cancel-order.test.ts`

- [ ] **Step 1: Write cancel order tests**

```typescript
// tests/domains/orders/actions/cancel-order.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { cancelOrder } from "@/domains/orders/actions/cancel-order";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn() }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ returning: vi.fn() }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
      orderItems: { findMany: vi.fn() },
      listings: { findFirst: vi.fn() },
    },
    transaction: vi.fn(),
  };
  return { db: mockDb };
});

describe("cancelOrder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("allows customer to cancel PENDING order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "PENDING",
    } as any);
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => fn(db as any));

    const result = await cancelOrder({ orderId: "order-1", reason: "Zmiana planow" });
    expect(result.success).toBe(true);
  });

  it("prevents customer from cancelling CONFIRMED order without farmer role", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await cancelOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("zgody rolnika");
  });

  it("allows farmer to cancel at any stage with reason", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "PAID",
    } as any);
    vi.mocked(db.query.orderItems.findMany).mockResolvedValueOnce([]);
    vi.mocked(db.transaction).mockImplementationOnce(async (fn) => fn(db as any));

    const result = await cancelOrder({ orderId: "order-1", reason: "Brak towaru" });
    expect(result.success).toBe(true);
  });

  it("farmer must provide reason", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "CONFIRMED",
    } as any);

    const result = await cancelOrder({ orderId: "order-1" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("powod");
  });

  it("cannot cancel COMPLETED order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
      status: "COMPLETED",
    } as any);

    const result = await cancelOrder({ orderId: "order-1", reason: "Test" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/orders/actions/cancel-order.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement cancelOrder**

```typescript
// src/domains/orders/actions/cancel-order.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, orderItems, orderStatusHistory, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { cancelOrderSchema, type CancelOrderInput } from "../schemas/validation";

type CancelResult = { success: true } | { success: false; error?: string; errors?: Record<string, string[]> };

const CUSTOMER_FREE_CANCEL = ["PENDING", "MODIFIED"];
const NON_CANCELLABLE = ["COMPLETED", "CANCELLED"];

export async function cancelOrder(input: CancelOrderInput): Promise<CancelResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = cancelOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const { orderId, reason } = parsed.data;

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });

  if (!order) {
    return { success: false, error: "Zamowienie nie istnieje" };
  }

  const isCustomer = order.customerId === session.user.id;
  const isFarmer = order.farmerId === session.user.id;

  if (!isCustomer && !isFarmer) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (NON_CANCELLABLE.includes(order.status)) {
    return { success: false, error: "Nie mozna anulowac zamowienia w tym statusie" };
  }

  // Customer rules
  if (isCustomer && !CUSTOMER_FREE_CANCEL.includes(order.status)) {
    return { success: false, error: "Anulowanie wymaga zgody rolnika po potwierdzeniu zamowienia" };
  }

  // Farmer must provide reason
  if (isFarmer && !reason) {
    return { success: false, error: "Rolnik musi podac powod anulowania" };
  }

  // Restore quantities if order was confirmed+
  const needsRestore = ["CONFIRMED", "PAID", "PREPARING", "SHIPPED", "READY_FOR_PICKUP"].includes(order.status);

  await db.transaction(async (tx) => {
    if (needsRestore) {
      const items = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, orderId),
      });

      for (const item of items) {
        const listing = await tx.query.listings.findFirst({
          where: eq(listings.id, item.listingId),
        });

        if (listing?.quantityAvailable) {
          const qty = item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
          const restored = Number(listing.quantityAvailable) + qty;
          await tx
            .update(listings)
            .set({ quantityAvailable: String(restored) })
            .where(eq(listings.id, item.listingId));
        }
      }
    }

    await tx
      .update(orders)
      .set({
        status: "CANCELLED",
        cancellationReason: reason ?? null,
        cancelledBy: isFarmer ? "FARMER" : "CUSTOMER",
      })
      .where(eq(orders.id, orderId));

    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "CANCELLED",
      note: reason ?? null,
      createdBy: session.user!.id!,
    });
  });

  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/orders/actions/cancel-order.test.ts
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/orders/actions/cancel-order.ts tests/domains/orders/actions/cancel-order.test.ts
git commit -m "feat(orders): add cancel order action with tests"
```

---

## Task 10: Farmer Payment Methods and Pickup Slots Actions

**Files:**
- Create: `src/domains/orders/actions/manage-payment-methods.ts`
- Create: `src/domains/orders/actions/manage-pickup-slots.ts`

- [ ] **Step 1: Implement manage-payment-methods**

```typescript
// src/domains/orders/actions/manage-payment-methods.ts
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

async function requireFarmer() {
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

  // If setting as default, unset other defaults
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
```

- [ ] **Step 2: Implement manage-pickup-slots**

```typescript
// src/domains/orders/actions/manage-pickup-slots.ts
"use server";

import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { pickupSlots, users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { pickupSlotSchema, type PickupSlotInput } from "../schemas/validation";

type SlotResult =
  | { success: true; id: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

type SimpleResult = { success: true } | { success: false; error: string };

async function requireFarmer() {
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
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/actions/manage-payment-methods.ts src/domains/orders/actions/manage-pickup-slots.ts
git commit -m "feat(orders): add farmer payment methods and pickup slots management"
```

---

## Task 11: Queries

**Files:**
- Create: `src/domains/orders/queries/get-cart.ts`
- Create: `src/domains/orders/queries/get-order.ts`
- Create: `src/domains/orders/queries/get-customer-orders.ts`
- Create: `src/domains/orders/queries/get-farmer-orders.ts`
- Create: `src/domains/orders/queries/get-farmer-payment-methods.ts`
- Create: `src/domains/orders/queries/get-pickup-slots.ts`

- [ ] **Step 1: Implement getCart**

```typescript
// src/domains/orders/queries/get-cart.ts
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { cartItems, listings, products, users } from "@/shared/db/schema";

export async function getCart(userId: string) {
  const items = await db
    .select({
      cartItem: cartItems,
      listing: listings,
      product: products,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(cartItems)
    .innerJoin(listings, eq(cartItems.listingId, listings.id))
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .where(eq(cartItems.userId, userId));

  // Group by farmer
  const grouped = new Map<string, {
    farmer: { id: string; name: string | null; avatar: string | null };
    items: typeof items;
    total: number;
  }>();

  for (const item of items) {
    const farmerId = item.farmer.id;
    if (!grouped.has(farmerId)) {
      grouped.set(farmerId, {
        farmer: item.farmer,
        items: [],
        total: 0,
      });
    }
    const group = grouped.get(farmerId)!;
    group.items.push(item);
    group.total += Number(item.cartItem.quantity) * Number(item.listing.price);
  }

  return Array.from(grouped.values());
}

export type CartGroup = Awaited<ReturnType<typeof getCart>>[number];
```

- [ ] **Step 2: Implement getOrder**

```typescript
// src/domains/orders/queries/get-order.ts
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  orders, orderItems, orderStatusHistory, paymentProofs,
  farmerPaymentMethods, pickupSlots, users,
} from "@/shared/db/schema";

export async function getOrder(orderId: string) {
  const order = await db.query.orders.findFirst({
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
        orderBy: (h, { asc }) => [asc(h.createdAt)],
      },
      paymentProofs: true,
      pickupSlot: true,
    },
  });

  if (!order) return null;

  // Also fetch farmer payment methods
  const paymentMethods = await db.query.farmerPaymentMethods.findMany({
    where: eq(farmerPaymentMethods.farmerId, order.farmerId),
  });

  return { ...order, farmerPaymentMethods: paymentMethods };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrder>>>;
```

- [ ] **Step 3: Implement getCustomerOrders**

```typescript
// src/domains/orders/queries/get-customer-orders.ts
import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, users } from "@/shared/db/schema";

const ITEMS_PER_PAGE = 10;

export async function getCustomerOrders(
  userId: string,
  filters?: { status?: string; page?: number }
) {
  const conditions = [eq(orders.customerId, userId)];

  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status as any));
  }

  const page = filters?.page ?? 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const results = await db
    .select({
      order: orders,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(orders)
    .innerJoin(users, eq(orders.farmerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  return results;
}

export type CustomerOrderItem = Awaited<ReturnType<typeof getCustomerOrders>>[number];
```

- [ ] **Step 4: Implement getFarmerOrders**

```typescript
// src/domains/orders/queries/get-farmer-orders.ts
import { eq, desc, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders, users } from "@/shared/db/schema";

const ITEMS_PER_PAGE = 10;

export async function getFarmerOrders(
  farmerId: string,
  filters?: { status?: string; page?: number }
) {
  const conditions = [eq(orders.farmerId, farmerId)];

  if (filters?.status) {
    conditions.push(eq(orders.status, filters.status as any));
  }

  const page = filters?.page ?? 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  const results = await db
    .select({
      order: orders,
      customer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(orders)
    .innerJoin(users, eq(orders.customerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  return results;
}

export type FarmerOrderItem = Awaited<ReturnType<typeof getFarmerOrders>>[number];
```

- [ ] **Step 5: Implement getFarmerPaymentMethods and getPickupSlots**

```typescript
// src/domains/orders/queries/get-farmer-payment-methods.ts
import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { farmerPaymentMethods } from "@/shared/db/schema";

export async function getFarmerPaymentMethods(farmerId: string) {
  return db.query.farmerPaymentMethods.findMany({
    where: and(
      eq(farmerPaymentMethods.farmerId, farmerId),
      eq(farmerPaymentMethods.isActive, true),
    ),
  });
}
```

```typescript
// src/domains/orders/queries/get-pickup-slots.ts
import { eq, and, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import { pickupSlots } from "@/shared/db/schema";

export async function getGlobalPickupSlots(farmerId: string) {
  return db.query.pickupSlots.findMany({
    where: and(
      eq(pickupSlots.farmerId, farmerId),
      isNull(pickupSlots.orderId),
      eq(pickupSlots.isActive, true),
    ),
  });
}

export async function getOrderPickupSlots(orderId: string) {
  return db.query.pickupSlots.findMany({
    where: and(
      eq(pickupSlots.orderId, orderId),
      eq(pickupSlots.isActive, true),
    ),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/domains/orders/queries/
git commit -m "feat(orders): add all queries — cart, orders, payment methods, pickup slots"
```

---

## Task 12: Domain Barrel Export and Types

**Files:**
- Create: `src/domains/orders/types/index.ts`
- Create: `src/domains/orders/index.ts`

- [ ] **Step 1: Create types**

```typescript
// src/domains/orders/types/index.ts
export type OrderStatus =
  | "PENDING"
  | "MODIFIED"
  | "CONFIRMED"
  | "PAID"
  | "PREPARING"
  | "SHIPPED"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED";

export type DeliveryMethod = "PICKUP" | "DELIVERY" | "DROP_POINT";

export type PaymentMethod = "BLIK" | "TRANSFER" | "CRYPTO" | "CASH_ON_PICKUP";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Zlożone",
  MODIFIED: "Zmodyfikowane",
  CONFIRMED: "Potwierdzone",
  PAID: "Oplacone",
  PREPARING: "W przygotowaniu",
  SHIPPED: "Wyslane",
  READY_FOR_PICKUP: "Gotowe do odbioru",
  COMPLETED: "Odebrane",
  CANCELLED: "Anulowane",
};

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  PICKUP: "Odbior osobisty",
  DELIVERY: "Wysylka",
  DROP_POINT: "Punkt odbioru",
};
```

- [ ] **Step 2: Create barrel export**

```typescript
// src/domains/orders/index.ts
export {
  addToCartSchema,
  createOrderSchema,
  modifyOrderSchema,
  submitPaymentProofSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  shippingInfoSchema,
  farmerPaymentMethodSchema,
  pickupSlotSchema,
  type AddToCartInput,
  type CreateOrderInput,
  type ModifyOrderInput,
  type SubmitPaymentProofInput,
  type CancelOrderInput,
  type UpdateOrderStatusInput,
  type ShippingInfoInput,
  type FarmerPaymentMethodInput,
  type PickupSlotInput,
} from "./schemas/validation";

export { addToCart } from "./actions/add-to-cart";
export { updateCartItem } from "./actions/update-cart-item";
export { removeFromCart } from "./actions/remove-from-cart";
export { createOrder } from "./actions/create-order";
export { modifyOrder } from "./actions/modify-order";
export { acceptModification } from "./actions/accept-modification";
export { confirmOrder } from "./actions/confirm-order";
export { submitPaymentProof } from "./actions/submit-payment-proof";
export { verifyPayment } from "./actions/verify-payment";
export { updateOrderStatus, markAsShipped } from "./actions/update-order-status";
export { completeOrder } from "./actions/complete-order";
export { cancelOrder } from "./actions/cancel-order";
export { addPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "./actions/manage-payment-methods";
export { addPickupSlot, updatePickupSlot, deletePickupSlot } from "./actions/manage-pickup-slots";

export type { OrderStatus, DeliveryMethod, PaymentMethod } from "./types";
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/types/index.ts src/domains/orders/index.ts
git commit -m "feat(orders): add domain types and barrel export"
```

---

## Task 13: i18n — Polish Translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add orders namespace to pl.json**

Add the following namespace to `messages/pl.json`:

```json
"orders": {
  "title": "Moje zamowienia",
  "farmerOrders": "Zamowienia klientow",
  "cart": "Koszyk",
  "emptyCart": "Twoj koszyk jest pusty",
  "checkout": "Zloz zamowienie",
  "orderNumber": "Nr zamowienia",
  "orderDate": "Data zlozenia",
  "total": "Suma",
  "shippingCost": "Koszt wysylki",
  "subtotal": "Podsumowanie",
  "addToCart": "Dodaj do koszyka",
  "quantity": "Ilosc",
  "placeOrder": "Zloz zamowienie",
  "delivery": "Dostawa",
  "deliveryPickup": "Odbior osobisty",
  "deliveryShipping": "Wysylka",
  "deliveryDropPoint": "Punkt odbioru",
  "deliveryAddress": "Adres dostawy",
  "pickupSlot": "Termin odbioru",
  "chooseSlot": "Wybierz termin",
  "customerNote": "Notatka dla rolnika",
  "farmerNote": "Notatka od rolnika",
  "statusPending": "Zlożone",
  "statusModified": "Zmodyfikowane",
  "statusConfirmed": "Potwierdzone",
  "statusPaid": "Oplacone",
  "statusPreparing": "W przygotowaniu",
  "statusShipped": "Wyslane",
  "statusReadyForPickup": "Gotowe do odbioru",
  "statusCompleted": "Odebrane",
  "statusCancelled": "Anulowane",
  "confirm": "Potwierdz zamowienie",
  "modify": "Modyfikuj zamowienie",
  "acceptModification": "Akceptuj zmiany",
  "rejectModification": "Odrzuc zmiany",
  "cancel": "Anuluj zamowienie",
  "cancelReason": "Powod anulowania",
  "completeOrder": "Potwierdz odbior",
  "payment": "Platnosc",
  "paymentMethod": "Metoda platnosci",
  "paymentMethodBlik": "BLIK",
  "paymentMethodTransfer": "Przelew bankowy",
  "paymentMethodCrypto": "Kryptowaluta",
  "paymentMethodCashOnPickup": "Gotowka przy odbiorze",
  "paymentPrepaid": "Przedplata",
  "paymentOnPickup": "Platnosc przy odbiorze",
  "paymentProof": "Dowod platnosci",
  "submitProof": "Przeslij dowod platnosci",
  "proofScreenshot": "Zrzut ekranu",
  "proofBankTransfer": "Potwierdzenie przelewu",
  "proofBlockchain": "Link do transakcji blockchain",
  "verifyPayment": "Potwierdz otrzymanie platnosci",
  "paymentVerified": "Platnosc potwierdzona",
  "paymentPending": "Oczekuje na potwierdzenie",
  "tracking": "Sledzenie przesylki",
  "trackingNumber": "Numer przesylki",
  "trackingUrl": "Link do sledzenia",
  "markShipped": "Oznacz jako wyslane",
  "markReady": "Oznacz jako gotowe do odbioru",
  "markPreparing": "Rozpocznij przygotowanie",
  "messageToFarmer": "Napisz do rolnika",
  "messageToCustomer": "Napisz do klienta",
  "original": "Oryginalne",
  "modified": "Zmodyfikowane",
  "pricePerUnit": "Cena za jednostke",
  "paymentMethods": "Metody platnosci",
  "addPaymentMethod": "Dodaj metode platnosci",
  "editPaymentMethod": "Edytuj metode platnosci",
  "paymentLabel": "Nazwa",
  "paymentDetails": "Dane (nr telefonu, nr konta, adres krypto)",
  "setAsDefault": "Ustaw jako domyslna",
  "pickupSchedule": "Harmonogram odbioru",
  "addSlot": "Dodaj termin",
  "dayOfWeek": "Dzien tygodnia",
  "startTime": "Od",
  "endTime": "Do",
  "monday": "Poniedzialek",
  "tuesday": "Wtorek",
  "wednesday": "Sroda",
  "thursday": "Czwartek",
  "friday": "Piatek",
  "saturday": "Sobota",
  "sunday": "Niedziela",
  "noOrders": "Brak zamowien",
  "filterAll": "Wszystkie",
  "filterActive": "Aktywne",
  "filterCompleted": "Zakonczone",
  "filterCancelled": "Anulowane",
  "paymentReminder": "Pamietaj o zwrocie platnosci klientowi",
  "waitingForAcceptance": "Oczekuje na akceptacje klienta"
}
```

- [ ] **Step 2: Commit**

```bash
git add messages/pl.json
git commit -m "feat(orders): add Polish translations for order system"
```

---

## Task 14: UI Components — Cart

**Files:**
- Create: `src/domains/orders/components/cart/cart-view.tsx`
- Create: `src/domains/orders/components/cart/cart-item-row.tsx`

- [ ] **Step 1: Implement CartItemRow**

```typescript
// src/domains/orders/components/cart/cart-item-row.tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Trash2, Minus, Plus } from "lucide-react";
import { updateCartItem } from "../../actions/update-cart-item";
import { removeFromCart } from "../../actions/remove-from-cart";

interface CartItemRowProps {
  cartItemId: string;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
  image?: string;
  onUpdate: () => void;
}

export function CartItemRow({
  cartItemId, productName, quantity, price, unit, image, onUpdate,
}: CartItemRowProps) {
  const t = useTranslations("orders");
  const [isPending, startTransition] = useTransition();
  const [qty, setQty] = useState(quantity);

  function handleQuantityChange(newQty: number) {
    if (newQty <= 0) return;
    setQty(newQty);
    startTransition(async () => {
      await updateCartItem(cartItemId, newQty);
      onUpdate();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeFromCart(cartItemId);
      onUpdate();
    });
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b">
      {image ? (
        <img src={image} alt={productName} className="w-16 h-16 rounded object-cover" />
      ) : (
        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-2xl">🌱</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{productName}</p>
        <p className="text-sm text-muted-foreground">
          {price.toFixed(2)} zl / {unit.toLowerCase()}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(qty - 1)}
          disabled={isPending || qty <= 1}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Input
          type="number"
          value={qty}
          onChange={(e) => handleQuantityChange(Number(e.target.value))}
          className="w-16 h-8 text-center"
          min={1}
          disabled={isPending}
        />
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleQuantityChange(qty + 1)}
          disabled={isPending}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <p className="w-20 text-right font-medium">
        {(qty * price).toFixed(2)} zl
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive"
        onClick={handleRemove}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Implement CartView**

```typescript
// src/domains/orders/components/cart/cart-view.tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { ShoppingCart, User } from "lucide-react";
import { CartItemRow } from "./cart-item-row";
import type { CartGroup } from "../../queries/get-cart";

interface CartViewProps {
  groups: CartGroup[];
}

export function CartView({ groups }: CartViewProps) {
  const t = useTranslations("orders");
  const router = useRouter();

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("emptyCart")}</p>
      </div>
    );
  }

  function handleUpdate() {
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group.farmer.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {group.farmer.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {group.items.map((item) => (
              <CartItemRow
                key={item.cartItem.id}
                cartItemId={item.cartItem.id}
                productName={item.product.name}
                quantity={Number(item.cartItem.quantity)}
                price={Number(item.listing.price)}
                unit={item.listing.unit}
                image={item.product.images?.[0]}
                onUpdate={handleUpdate}
              />
            ))}
          </CardContent>
          <CardFooter className="flex justify-between">
            <p className="font-semibold">
              {t("total")}: {group.total.toFixed(2)} zl
            </p>
            <Button onClick={() => router.push(`/marketplace/cart/${group.farmer.id}/checkout`)}>
              {t("checkout")}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/components/cart/
git commit -m "feat(orders): add cart UI components"
```

---

## Task 15: UI Components — Checkout Form

**Files:**
- Create: `src/domains/orders/components/checkout/checkout-form.tsx`

- [ ] **Step 1: Implement CheckoutForm**

```typescript
// src/domains/orders/components/checkout/checkout-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { MapPin, Truck, Package } from "lucide-react";
import { createOrder } from "../../actions/create-order";
import type { CartGroup } from "../../queries/get-cart";
import type { PickupSlot } from "@/shared/db/schema";

interface CheckoutFormProps {
  cartGroup: CartGroup;
  farmerId: string;
  pickupSlots: PickupSlot[];
  availableDeliveryMethods: string[];
}

const DAY_NAMES = ["Niedziela", "Poniedzialek", "Wtorek", "Sroda", "Czwartek", "Piatek", "Sobota"];

export function CheckoutForm({ cartGroup, farmerId, pickupSlots, availableDeliveryMethods }: CheckoutFormProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [deliveryMethod, setDeliveryMethod] = useState(availableDeliveryMethods[0] ?? "PICKUP");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [pickupSlotId, setPickupSlotId] = useState("");
  const [customerNote, setCustomerNote] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createOrder({
        farmerId,
        deliveryMethod: deliveryMethod as "PICKUP" | "DELIVERY" | "DROP_POINT",
        deliveryAddress: deliveryMethod === "DELIVERY" ? deliveryAddress : undefined,
        pickupSlotId: deliveryMethod === "PICKUP" && pickupSlotId ? pickupSlotId : undefined,
        customerNote: customerNote || undefined,
      });

      if (result.success) {
        router.push(`/orders/${result.orderId}`);
      } else {
        setError(result.error ?? "Wystapil blad");
      }
    });
  }

  const deliveryIcons = { PICKUP: MapPin, DELIVERY: Truck, DROP_POINT: Package };

  return (
    <div className="space-y-6">
      {/* Order summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("subtotal")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {cartGroup.items.map((item) => (
            <div key={item.cartItem.id} className="flex justify-between text-sm">
              <span>
                {item.product.name} x {Number(item.cartItem.quantity)} {item.listing.unit.toLowerCase()}
              </span>
              <span>{(Number(item.cartItem.quantity) * Number(item.listing.price)).toFixed(2)} zl</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>{cartGroup.total.toFixed(2)} zl</span>
          </div>
        </CardContent>
      </Card>

      {/* Delivery method */}
      <Card>
        <CardHeader>
          <CardTitle>{t("delivery")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={deliveryMethod} onValueChange={setDeliveryMethod}>
            {availableDeliveryMethods.map((method) => {
              const Icon = deliveryIcons[method as keyof typeof deliveryIcons] ?? Package;
              const labelKey = method === "PICKUP" ? "deliveryPickup" : method === "DELIVERY" ? "deliveryShipping" : "deliveryDropPoint";
              return (
                <div key={method} className="flex items-center space-x-3 p-3 rounded-lg border">
                  <RadioGroupItem value={method} id={method} />
                  <Label htmlFor={method} className="flex items-center gap-2 cursor-pointer">
                    <Icon className="h-4 w-4" />
                    {t(labelKey)}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>

          {deliveryMethod === "DELIVERY" && (
            <div className="mt-4">
              <Label htmlFor="address">{t("deliveryAddress")}</Label>
              <Input
                id="address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="ul. Polna 1, 00-001 Warszawa"
              />
            </div>
          )}

          {deliveryMethod === "PICKUP" && pickupSlots.length > 0 && (
            <div className="mt-4">
              <Label>{t("pickupSlot")}</Label>
              <Select value={pickupSlotId} onValueChange={setPickupSlotId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("chooseSlot")} />
                </SelectTrigger>
                <SelectContent>
                  {pickupSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.dayOfWeek !== null
                        ? `${DAY_NAMES[slot.dayOfWeek]} ${slot.startTime}-${slot.endTime}`
                        : `${slot.specificDate} ${slot.startTime}-${slot.endTime}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <Card>
        <CardContent className="pt-6">
          <Label htmlFor="note">{t("customerNote")}</Label>
          <Textarea
            id="note"
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </CardContent>
      </Card>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={isPending}
      >
        {isPending ? "..." : t("placeOrder")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/orders/components/checkout/
git commit -m "feat(orders): add checkout form component"
```

---

## Task 16: UI Components — Order List and Order Detail

**Files:**
- Create: `src/domains/orders/components/order-list/order-card.tsx`
- Create: `src/domains/orders/components/order-list/order-list.tsx`
- Create: `src/domains/orders/components/order-detail/order-timeline.tsx`
- Create: `src/domains/orders/components/order-detail/order-items-table.tsx`
- Create: `src/domains/orders/components/order-detail/payment-proof-form.tsx`
- Create: `src/domains/orders/components/order-detail/modification-review.tsx`
- Create: `src/domains/orders/components/order-detail/order-detail.tsx`

- [ ] **Step 1: Implement OrderCard**

```typescript
// src/domains/orders/components/order-list/order-card.tsx
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import { User } from "lucide-react";
import type { OrderStatus } from "../../types";

interface OrderCardProps {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: string;
  createdAt: Date;
  counterpartyName: string | null;
  counterpartyAvatar: string | null;
  href: string;
}

const STATUS_VARIANTS: Record<OrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "outline",
  MODIFIED: "secondary",
  CONFIRMED: "default",
  PAID: "default",
  PREPARING: "default",
  SHIPPED: "default",
  READY_FOR_PICKUP: "default",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export function OrderCard({
  orderNumber, status, totalAmount, createdAt, counterpartyName, href,
}: OrderCardProps) {
  const t = useTranslations("orders");

  const statusLabel = t(`status${status.charAt(0) + status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as any);

  return (
    <Link href={href}>
      <Card className="hover:bg-muted/50 transition-colors">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex-1 min-w-0">
            <p className="font-medium">{orderNumber}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {counterpartyName}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">{Number(totalAmount).toFixed(2)} zl</p>
            <p className="text-xs text-muted-foreground">
              {new Date(createdAt).toLocaleDateString("pl")}
            </p>
          </div>
          <Badge variant={STATUS_VARIANTS[status]}>{statusLabel}</Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Implement OrderList**

```typescript
// src/domains/orders/components/order-list/order-list.tsx
"use client";

import { useTranslations } from "next-intl";
import { Package } from "lucide-react";
import { OrderCard } from "./order-card";
import type { OrderStatus } from "../../types";

interface OrderListItem {
  order: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: string;
    createdAt: Date;
  };
  counterparty: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface OrderListProps {
  orders: OrderListItem[];
  basePath: string; // "/orders" for customer, "/farmer/orders" for farmer
}

export function OrderList({ orders, basePath }: OrderListProps) {
  const t = useTranslations("orders");

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">{t("noOrders")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(({ order, counterparty }) => (
        <OrderCard
          key={order.id}
          orderId={order.id}
          orderNumber={order.orderNumber}
          status={order.status}
          totalAmount={order.totalAmount}
          createdAt={order.createdAt}
          counterpartyName={counterparty.name}
          counterpartyAvatar={counterparty.avatar}
          href={`${basePath}/${order.id}`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement OrderTimeline**

```typescript
// src/domains/orders/components/order-detail/order-timeline.tsx
"use client";

import { useTranslations } from "next-intl";
import { Check, Clock } from "lucide-react";
import type { OrderStatusHistory } from "@/shared/db/schema";

interface OrderTimelineProps {
  history: OrderStatusHistory[];
}

export function OrderTimeline({ history }: OrderTimelineProps) {
  const t = useTranslations("orders");

  return (
    <div className="space-y-4">
      {history.map((entry, i) => {
        const isLast = i === history.length - 1;
        const statusKey = `status${entry.status.charAt(0) + entry.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-1 ${isLast ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {isLast ? <Clock className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              </div>
              {i < history.length - 1 && <div className="w-px h-full bg-border" />}
            </div>
            <div className="pb-4">
              <p className="font-medium text-sm">{t(statusKey as any)}</p>
              {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
              <p className="text-xs text-muted-foreground">
                {new Date(entry.createdAt).toLocaleString("pl")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Implement OrderItemsTable**

```typescript
// src/domains/orders/components/order-detail/order-items-table.tsx
"use client";

import { useTranslations } from "next-intl";
import type { OrderItem } from "@/shared/db/schema";

interface OrderItemsTableProps {
  items: OrderItem[];
  showModified?: boolean;
}

export function OrderItemsTable({ items, showModified = false }: OrderItemsTableProps) {
  const t = useTranslations("orders");

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Produkt</th>
            <th className="text-right py-2">{t("quantity")}</th>
            <th className="text-right py-2">{t("pricePerUnit")}</th>
            <th className="text-right py-2">{t("total")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const hasModification = showModified && (item.modifiedQuantity || item.modifiedPricePerUnit);
            const qty = hasModification && item.modifiedQuantity ? Number(item.modifiedQuantity) : Number(item.quantity);
            const price = hasModification && item.modifiedPricePerUnit ? Number(item.modifiedPricePerUnit) : Number(item.pricePerUnit);

            return (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.productName}</td>
                <td className="text-right py-2">
                  {hasModification && item.modifiedQuantity ? (
                    <span>
                      <span className="line-through text-muted-foreground mr-1">{Number(item.quantity)}</span>
                      <span className="text-primary font-medium">{qty}</span>
                    </span>
                  ) : (
                    qty
                  )}{" "}
                  {item.unit.toLowerCase()}
                </td>
                <td className="text-right py-2">
                  {hasModification && item.modifiedPricePerUnit ? (
                    <span>
                      <span className="line-through text-muted-foreground mr-1">{Number(item.pricePerUnit).toFixed(2)}</span>
                      <span className="text-primary font-medium">{price.toFixed(2)}</span>
                    </span>
                  ) : (
                    price.toFixed(2)
                  )}{" "}
                  zl
                </td>
                <td className="text-right py-2 font-medium">{(qty * price).toFixed(2)} zl</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 5: Implement PaymentProofForm**

```typescript
// src/domains/orders/components/order-detail/payment-proof-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Camera, Link as LinkIcon, Wallet } from "lucide-react";
import { submitPaymentProof } from "../../actions/submit-payment-proof";

interface PaymentProofFormProps {
  orderId: string;
}

export function PaymentProofForm({ orderId }: PaymentProofFormProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"SCREENSHOT" | "BANK_TRANSFER" | "BLOCKCHAIN_LINK">("SCREENSHOT");
  const [imageUrl, setImageUrl] = useState("");
  const [transactionUrl, setTransactionUrl] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitPaymentProof({
        orderId,
        type,
        imageUrl: type === "SCREENSHOT" || type === "BANK_TRANSFER" ? imageUrl || undefined : undefined,
        transactionUrl: type === "BLOCKCHAIN_LINK" ? transactionUrl || undefined : undefined,
        description: description || undefined,
      });

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error ?? "Wystapil blad");
      }
    });
  }

  return (
    <div className="space-y-4">
      <RadioGroup value={type} onValueChange={(v) => setType(v as typeof type)}>
        <div className="flex items-center space-x-3 p-3 rounded-lg border">
          <RadioGroupItem value="SCREENSHOT" id="proof-screenshot" />
          <Label htmlFor="proof-screenshot" className="flex items-center gap-2 cursor-pointer">
            <Camera className="h-4 w-4" />
            {t("proofScreenshot")}
          </Label>
        </div>
        <div className="flex items-center space-x-3 p-3 rounded-lg border">
          <RadioGroupItem value="BANK_TRANSFER" id="proof-transfer" />
          <Label htmlFor="proof-transfer" className="flex items-center gap-2 cursor-pointer">
            <Wallet className="h-4 w-4" />
            {t("proofBankTransfer")}
          </Label>
        </div>
        <div className="flex items-center space-x-3 p-3 rounded-lg border">
          <RadioGroupItem value="BLOCKCHAIN_LINK" id="proof-blockchain" />
          <Label htmlFor="proof-blockchain" className="flex items-center gap-2 cursor-pointer">
            <LinkIcon className="h-4 w-4" />
            {t("proofBlockchain")}
          </Label>
        </div>
      </RadioGroup>

      {(type === "SCREENSHOT" || type === "BANK_TRANSFER") && (
        <div>
          <Label>URL obrazka</Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Przeslij zrzut ekranu przez upload obrazka i wklej URL
          </p>
        </div>
      )}

      {type === "BLOCKCHAIN_LINK" && (
        <div>
          <Label>URL transakcji</Label>
          <Input
            value={transactionUrl}
            onChange={(e) => setTransactionUrl(e.target.value)}
            placeholder="https://etherscan.io/tx/..."
          />
        </div>
      )}

      <div>
        <Label>Opis (opcjonalnie)</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={1000}
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button onClick={handleSubmit} disabled={isPending} className="w-full">
        {isPending ? "..." : t("submitProof")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Implement ModificationReview**

```typescript
// src/domains/orders/components/order-detail/modification-review.tsx
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
import type { OrderItem } from "@/shared/db/schema";

interface ModificationReviewProps {
  orderId: string;
  items: OrderItem[];
  originalTotal: string;
  newTotal: string;
  farmerNote: string | null;
}

export function ModificationReview({
  orderId, items, originalTotal, newTotal, farmerNote,
}: ModificationReviewProps) {
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
      const result = await cancelOrder({ orderId, reason: "Odrzucono modyfikacje" });
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
        <div className="flex justify-between font-semibold pt-2 border-t">
          <span>{t("total")}</span>
          <span>
            {Number(originalTotal) !== Number(newTotal) && (
              <span className="line-through text-muted-foreground mr-2">
                {Number(originalTotal).toFixed(2)} zl
              </span>
            )}
            {Number(newTotal).toFixed(2)} zl
          </span>
        </div>
      </CardContent>
      <CardFooter className="gap-3">
        <Button onClick={handleAccept} disabled={isPending} className="flex-1">
          {t("acceptModification")}
        </Button>
        <Button variant="destructive" onClick={handleReject} disabled={isPending} className="flex-1">
          {t("rejectModification")}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

- [ ] **Step 7: Implement OrderDetail (customer view)**

```typescript
// src/domains/orders/components/order-detail/order-detail.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { MessageCircle, Package, Truck, MapPin, ExternalLink } from "lucide-react";
import { OrderTimeline } from "./order-timeline";
import { OrderItemsTable } from "./order-items-table";
import { PaymentProofForm } from "./payment-proof-form";
import { ModificationReview } from "./modification-review";
import { completeOrder } from "../../actions/complete-order";
import { cancelOrder } from "../../actions/cancel-order";
import type { OrderDetail as OrderDetailType } from "../../queries/get-order";

interface OrderDetailProps {
  order: OrderDetailType;
  isCustomer: boolean;
}

export function OrderDetail({ order, isCustomer }: OrderDetailProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  function handleComplete() {
    startTransition(async () => {
      const result = await completeOrder(order.id);
      if (result.success) router.refresh();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelOrder({ orderId: order.id, reason: cancelReason || undefined });
      if (result.success) router.refresh();
    });
  }

  const showPaymentForm = isCustomer && order.status === "CONFIRMED" && order.paymentRequired === "PREPAID";
  const showModificationReview = isCustomer && order.status === "MODIFIED";
  const canComplete = isCustomer && (order.status === "SHIPPED" || order.status === "READY_FOR_PICKUP");
  const canCancel = isCustomer && ["PENDING", "MODIFIED"].includes(order.status);

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Modification review */}
      {showModificationReview && (
        <ModificationReview
          orderId={order.id}
          items={order.items}
          originalTotal={order.totalAmount}
          newTotal={order.totalAmount}
          farmerNote={order.farmerNote}
        />
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pozycje</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} showModified={order.status !== "PENDING"} />
          <Separator className="my-3" />
          {order.shippingCost && (
            <div className="flex justify-between text-sm">
              <span>{t("shippingCost")}</span>
              <span>{Number(order.shippingCost).toFixed(2)} zl</span>
            </div>
          )}
          <div className="flex justify-between font-semibold mt-2">
            <span>{t("total")}</span>
            <span>{Number(order.totalAmount).toFixed(2)} zl</span>
          </div>
        </CardContent>
      </Card>

      {/* Delivery info */}
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

      {/* Payment section */}
      {showPaymentForm && (
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentProof")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show farmer payment methods */}
            {order.farmerPaymentMethods.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{t("paymentMethods")} rolnika:</p>
                {order.farmerPaymentMethods.map((method) => (
                  <div key={method.id} className="text-sm p-2 bg-muted rounded">
                    <span className="font-medium">{method.label}:</span> {method.details}
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <PaymentProofForm orderId={order.id} />
          </CardContent>
        </Card>
      )}

      {/* Payment proofs list */}
      {order.paymentProofs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("paymentProof")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {order.paymentProofs.map((proof) => (
              <div key={proof.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Badge variant={proof.verified ? "default" : "outline"}>
                  {proof.verified ? t("paymentVerified") : t("paymentPending")}
                </Badge>
                <span className="text-sm">{proof.type}</span>
                {proof.transactionUrl && (
                  <a href={proof.transactionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary flex items-center gap-1">
                    Link <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Historia</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderTimeline history={order.statusHistory} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {canComplete && (
          <Button onClick={handleComplete} disabled={isPending} className="flex-1">
            {t("completeOrder")}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => router.push(`/messages`)}
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
              <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
                {t("cancel")}
              </Button>
              <Button variant="ghost" onClick={() => setShowCancel(false)}>
                {t("back" as any)}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/domains/orders/components/order-list/ src/domains/orders/components/order-detail/
git commit -m "feat(orders): add order list, order detail, and payment proof UI components"
```

---

## Task 17: UI Components — Farmer Dashboard

**Files:**
- Create: `src/domains/orders/components/farmer-dashboard/farmer-order-detail.tsx`
- Create: `src/domains/orders/components/farmer-dashboard/payment-methods-form.tsx`
- Create: `src/domains/orders/components/farmer-dashboard/pickup-schedule-form.tsx`

- [ ] **Step 1: Implement FarmerOrderDetail**

This component reuses OrderTimeline and OrderItemsTable but adds farmer-specific actions (confirm, modify, verify payment, mark as shipped/ready, cancel).

```typescript
// src/domains/orders/components/farmer-dashboard/farmer-order-detail.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { Check, Package, Truck, User } from "lucide-react";
import { OrderTimeline } from "../order-detail/order-timeline";
import { OrderItemsTable } from "../order-detail/order-items-table";
import { confirmOrder } from "../../actions/confirm-order";
import { verifyPayment } from "../../actions/verify-payment";
import { updateOrderStatus } from "../../actions/update-order-status";
import { markAsShipped } from "../../actions/update-order-status";
import { cancelOrder } from "../../actions/cancel-order";
import type { OrderDetail } from "../../queries/get-order";

interface FarmerOrderDetailProps {
  order: OrderDetail;
}

export function FarmerOrderDetail({ order }: FarmerOrderDetailProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [showModify, setShowModify] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmOrder(order.id);
      if (result.success) router.refresh();
    });
  }

  function handleVerifyPayment(proofId: string) {
    startTransition(async () => {
      const result = await verifyPayment(order.id, proofId);
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
  const canVerifyPayment = order.status === "CONFIRMED" && order.paymentProofs.some((p) => !p.verified);
  const canPrepare = order.status === "PAID" || (order.status === "CONFIRMED" && order.paymentRequired === "ON_PICKUP");
  const canShip = order.status === "PREPARING" && order.deliveryMethod === "DELIVERY";
  const canMarkReady = (order.status === "PREPARING" || order.status === "PAID" || (order.status === "CONFIRMED" && order.paymentRequired === "ON_PICKUP")) && order.deliveryMethod === "PICKUP";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <User className="h-3 w-3" /> {order.customer.name}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {t(`status${order.status.charAt(0) + order.status.slice(1).toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}` as any)}
        </Badge>
      </div>

      {order.customerNote && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">{t("customerNote")}: {order.customerNote}</p>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader><CardTitle>Pozycje</CardTitle></CardHeader>
        <CardContent>
          <OrderItemsTable items={order.items} showModified={order.status !== "PENDING"} />
          <Separator className="my-3" />
          <div className="flex justify-between font-semibold">
            <span>{t("total")}</span>
            <span>{Number(order.totalAmount).toFixed(2)} zl</span>
          </div>
        </CardContent>
      </Card>

      {/* Farmer actions */}
      <Card>
        <CardHeader><CardTitle>Akcje</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {canConfirm && (
            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={isPending}>
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
                <p className="text-sm text-muted-foreground">
                  Modyfikuj ilosci/ceny pozycji, koszt wysylki i ustal metode platnosci.
                  Po zapisaniu klient zobaczy zmiany i bedzie musial je zaakceptowac.
                </p>
                {/* Inline modification form — uses modifyOrder action.
                    Show order items with editable quantity/price fields,
                    shipping cost field, paymentRequired select (PREPAID/ON_PICKUP),
                    and farmerNote textarea. On submit calls modifyOrder(). */}
                <p className="text-xs text-muted-foreground italic">
                  Implementacja: formularz inline z polami edycji dla kazdej pozycji zamowienia,
                  kosztow wysylki, metody platnosci i notatki. Uzywa modifyOrder action.
                </p>
                <Button variant="ghost" onClick={() => setShowModify(false)}>Anuluj</Button>
              </CardContent>
            </Card>
          )}

          {canVerifyPayment && (
            <div className="space-y-3">
              <p className="font-medium">{t("paymentProof")}</p>
              {order.paymentProofs.filter((p) => !p.verified).map((proof) => (
                <div key={proof.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <Badge variant="outline">{proof.type}</Badge>
                    {proof.imageUrl && <img src={proof.imageUrl} alt="Proof" className="mt-2 max-w-xs rounded" />}
                    {proof.transactionUrl && (
                      <a href={proof.transactionUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary block mt-1">
                        {proof.transactionUrl}
                      </a>
                    )}
                  </div>
                  <Button onClick={() => handleVerifyPayment(proof.id)} disabled={isPending} size="sm">
                    {t("verifyPayment")}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {canPrepare && (
            <Button onClick={() => handleStatusChange("PREPARING")} disabled={isPending}>
              <Package className="h-4 w-4 mr-2" />
              {t("markPreparing")}
            </Button>
          )}

          {canMarkReady && (
            <Button onClick={() => handleStatusChange("READY_FOR_PICKUP")} disabled={isPending}>
              <Check className="h-4 w-4 mr-2" />
              {t("markReady")}
            </Button>
          )}

          {canShip && (
            <div className="space-y-3">
              <Label>{t("trackingNumber")}</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="PL123456789"
              />
              <Label>{t("trackingUrl")}</Label>
              <Input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://..."
              />
              <Button onClick={handleShip} disabled={isPending || !trackingNumber}>
                <Truck className="h-4 w-4 mr-2" />
                {t("markShipped")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle>Historia</CardTitle></CardHeader>
        <CardContent>
          <OrderTimeline history={order.statusHistory} />
        </CardContent>
      </Card>

      {/* Cancel */}
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
                  <Button variant="destructive" onClick={handleCancel} disabled={isPending || !cancelReason}>
                    {t("cancel")}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowCancel(false)}>Anuluj</Button>
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

- [ ] **Step 2: Implement PaymentMethodsForm**

```typescript
// src/domains/orders/components/farmer-dashboard/payment-methods-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { addPaymentMethod, deletePaymentMethod } from "../../actions/manage-payment-methods";
import type { FarmerPaymentMethod } from "@/shared/db/schema";

interface PaymentMethodsFormProps {
  methods: FarmerPaymentMethod[];
}

export function PaymentMethodsForm({ methods }: PaymentMethodsFormProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [type, setType] = useState<"BLIK" | "TRANSFER" | "CRYPTO">("BLIK");
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  function handleAdd() {
    startTransition(async () => {
      const result = await addPaymentMethod({ type, label, details, isDefault });
      if (result.success) {
        setShowAdd(false);
        setLabel("");
        setDetails("");
        setIsDefault(false);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePaymentMethod(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {methods.map((method) => (
        <Card key={method.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-medium">{method.label}</p>
              <p className="text-sm text-muted-foreground">{method.details}</p>
              {method.isDefault && <span className="text-xs text-primary">Domyslna</span>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => handleDelete(method.id)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}

      {showAdd ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("addPaymentMethod")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Typ</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BLIK">{t("paymentMethodBlik")}</SelectItem>
                  <SelectItem value="TRANSFER">{t("paymentMethodTransfer")}</SelectItem>
                  <SelectItem value="CRYPTO">{t("paymentMethodCrypto")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("paymentLabel")}</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="np. BLIK na telefon" />
            </div>
            <div>
              <Label>{t("paymentDetails")}</Label>
              <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="np. 600 123 456" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label>{t("setAsDefault")}</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={isPending || !label || !details}>
                {t("addPaymentMethod")}
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addPaymentMethod")}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement PickupScheduleForm**

```typescript
// src/domains/orders/components/farmer-dashboard/pickup-schedule-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Trash2, Plus, Clock } from "lucide-react";
import { addPickupSlot, deletePickupSlot } from "../../actions/manage-pickup-slots";
import type { PickupSlot } from "@/shared/db/schema";

interface PickupScheduleFormProps {
  slots: PickupSlot[];
}

const DAY_NAMES = ["Niedziela", "Poniedzialek", "Wtorek", "Sroda", "Czwartek", "Piatek", "Sobota"];

export function PickupScheduleForm({ slots }: PickupScheduleFormProps) {
  const t = useTranslations("orders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("14:00");

  function handleAdd() {
    startTransition(async () => {
      const result = await addPickupSlot({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      });
      if (result.success) {
        setShowAdd(false);
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deletePickupSlot(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {slots.map((slot) => (
        <Card key={slot.id}>
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {slot.dayOfWeek !== null ? DAY_NAMES[slot.dayOfWeek] : slot.specificDate}
                </p>
                <p className="text-sm text-muted-foreground">
                  {slot.startTime} - {slot.endTime}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => handleDelete(slot.id)}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}

      {showAdd ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("addSlot")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("dayOfWeek")}</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i)}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("startTime")}</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <Label>{t("endTime")}</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={isPending}>{t("addSlot")}</Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Anuluj</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("addSlot")}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/orders/components/farmer-dashboard/
git commit -m "feat(orders): add farmer dashboard components — order detail, payment methods, pickup schedule"
```

---

## Task 18: App Routes

**Files:**
- Create: `src/app/[locale]/(main)/marketplace/cart/page.tsx`
- Create: `src/app/[locale]/(main)/marketplace/cart/[farmerId]/checkout/page.tsx`
- Create: `src/app/[locale]/(main)/orders/page.tsx`
- Create: `src/app/[locale]/(main)/orders/[id]/page.tsx`
- Create: `src/app/[locale]/(main)/farmer/orders/page.tsx`
- Create: `src/app/[locale]/(main)/farmer/orders/[id]/page.tsx`
- Create: `src/app/[locale]/(main)/farmer/settings/payments/page.tsx`
- Create: `src/app/[locale]/(main)/farmer/settings/pickup-schedule/page.tsx`

- [ ] **Step 1: Cart page**

```typescript
// src/app/[locale]/(main)/marketplace/cart/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCart } from "@/domains/orders/queries/get-cart";
import { CartView } from "@/domains/orders/components/cart/cart-view";
import { getTranslations } from "next-intl/server";

export default async function CartPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const groups = await getCart(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("cart")}</h1>
      <CartView groups={groups} />
    </div>
  );
}
```

- [ ] **Step 2: Checkout page**

```typescript
// src/app/[locale]/(main)/marketplace/cart/[farmerId]/checkout/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCart } from "@/domains/orders/queries/get-cart";
import { getGlobalPickupSlots } from "@/domains/orders/queries/get-pickup-slots";
import { CheckoutForm } from "@/domains/orders/components/checkout/checkout-form";
import { getTranslations } from "next-intl/server";
import { getListing } from "@/domains/marketplace/queries/get-listing";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ farmerId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { farmerId } = await params;
  const t = await getTranslations("orders");
  const groups = await getCart(session.user.id);
  const cartGroup = groups.find((g) => g.farmer.id === farmerId);

  if (!cartGroup) notFound();

  const pickupSlots = await getGlobalPickupSlots(farmerId);

  // Determine available delivery methods from listings
  const allDeliveryOptions = cartGroup.items.flatMap(
    (item) => (item.listing.deliveryOptions as any[]) ?? []
  );
  const availableMethods = [...new Set(allDeliveryOptions.map((o) => o.type))];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("checkout")}</h1>
      <CheckoutForm
        cartGroup={cartGroup}
        farmerId={farmerId}
        pickupSlots={pickupSlots}
        availableDeliveryMethods={availableMethods}
      />
    </div>
  );
}
```

- [ ] **Step 3: Customer orders list page**

```typescript
// src/app/[locale]/(main)/orders/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getCustomerOrders } from "@/domains/orders/queries/get-customer-orders";
import { OrderList } from "@/domains/orders/components/order-list/order-list";
import { getTranslations } from "next-intl/server";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const params = await searchParams;

  const results = await getCustomerOrders(session.user.id, {
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const orders = results.map(({ order, farmer }) => ({
    order: { ...order, status: order.status as any },
    counterparty: farmer,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>
      <OrderList orders={orders} basePath="/orders" />
    </div>
  );
}
```

- [ ] **Step 4: Customer order detail page**

```typescript
// src/app/[locale]/(main)/orders/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getOrder } from "@/domains/orders/queries/get-order";
import { OrderDetail } from "@/domains/orders/components/order-detail/order-detail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();
  if (order.customerId !== session.user.id && order.farmerId !== session.user.id) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <OrderDetail order={order} isCustomer={order.customerId === session.user.id} />
    </div>
  );
}
```

- [ ] **Step 5: Farmer orders list page**

```typescript
// src/app/[locale]/(main)/farmer/orders/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getFarmerOrders } from "@/domains/orders/queries/get-farmer-orders";
import { OrderList } from "@/domains/orders/components/order-list/order-list";
import { getTranslations } from "next-intl/server";

export default async function FarmerOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const params = await searchParams;

  const results = await getFarmerOrders(session.user.id, {
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const orders = results.map(({ order, customer }) => ({
    order: { ...order, status: order.status as any },
    counterparty: customer,
  }));

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("farmerOrders")}</h1>
      <OrderList orders={orders} basePath="/farmer/orders" />
    </div>
  );
}
```

- [ ] **Step 6: Farmer order detail page**

```typescript
// src/app/[locale]/(main)/farmer/orders/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getOrder } from "@/domains/orders/queries/get-order";
import { FarmerOrderDetail } from "@/domains/orders/components/farmer-dashboard/farmer-order-detail";

export default async function FarmerOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();
  if (order.farmerId !== session.user.id) notFound();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <FarmerOrderDetail order={order} />
    </div>
  );
}
```

- [ ] **Step 7: Farmer settings pages**

```typescript
// src/app/[locale]/(main)/farmer/settings/payments/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getFarmerPaymentMethods } from "@/domains/orders/queries/get-farmer-payment-methods";
import { PaymentMethodsForm } from "@/domains/orders/components/farmer-dashboard/payment-methods-form";
import { getTranslations } from "next-intl/server";

export default async function PaymentMethodsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const methods = await getFarmerPaymentMethods(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("paymentMethods")}</h1>
      <PaymentMethodsForm methods={methods} />
    </div>
  );
}
```

```typescript
// src/app/[locale]/(main)/farmer/settings/pickup-schedule/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getGlobalPickupSlots } from "@/domains/orders/queries/get-pickup-slots";
import { PickupScheduleForm } from "@/domains/orders/components/farmer-dashboard/pickup-schedule-form";
import { getTranslations } from "next-intl/server";

export default async function PickupSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const t = await getTranslations("orders");
  const slots = await getGlobalPickupSlots(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("pickupSchedule")}</h1>
      <PickupScheduleForm slots={slots} />
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add src/app/[locale]/(main)/marketplace/cart/ src/app/[locale]/(main)/orders/ src/app/[locale]/(main)/farmer/
git commit -m "feat(orders): add all app routes — cart, checkout, orders, farmer dashboard, settings"
```

---

## Task 19: Product Detail Integration and Navigation

**Files:**
- Modify: `src/domains/marketplace/components/product-detail.tsx`
- Modify: `src/shared/ui/nav-bar.tsx`

- [ ] **Step 1: Add "Dodaj do koszyka" button to product detail**

In `src/domains/marketplace/components/product-detail.tsx`, add an "Add to cart" section below the delivery options. The component already has `useTransition` and `useRouter`. Add:

```typescript
// Add import at top
import { addToCart } from "@/domains/orders/actions/add-to-cart";

// Add state for quantity
const [cartQty, setCartQty] = useState(1);
const [cartSuccess, setCartSuccess] = useState(false);

// Add handler
function handleAddToCart() {
  startTransition(async () => {
    const result = await addToCart({ listingId: listing.id, quantity: cartQty });
    if (result.success) {
      setCartSuccess(true);
      setTimeout(() => setCartSuccess(false), 3000);
    }
  });
}
```

Add the UI section after the delivery options block and before the farmer card:

```tsx
{!isOwner && (
  <div className="flex items-center gap-3">
    <Input
      type="number"
      min={1}
      value={cartQty}
      onChange={(e) => setCartQty(Number(e.target.value))}
      className="w-20"
    />
    <Button onClick={handleAddToCart} disabled={isPending}>
      {cartSuccess ? "Dodano!" : t("addToCart" as any)}
    </Button>
  </div>
)}
```

Add `Input` import from `@/shared/ui/input`.

- [ ] **Step 2: Add cart and orders links to navigation**

In `src/shared/ui/nav-bar.tsx`, add a cart icon to the top right items:

```typescript
import { ShoppingCart } from "lucide-react";

// Add to topRightItems array, before messages:
{ href: "/marketplace/cart", icon: ShoppingCart, labelKey: "cart" as const },
```

Also add an orders link. The exact placement depends on the current nav structure — add to `bottomNavItems` or `topRightItems` depending on available space:

```typescript
import { Package } from "lucide-react";

// Add to topRightItems or as submenu item
{ href: "/orders", icon: Package, labelKey: "orders" as const },
```

- [ ] **Step 3: Add navigation translations to pl.json**

In `messages/pl.json`, in the `nav` namespace (or wherever nav labels are), add:

```json
"cart": "Koszyk",
"orders": "Zamowienia"
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/marketplace/components/product-detail.tsx src/shared/ui/nav-bar.tsx messages/pl.json
git commit -m "feat(orders): integrate add-to-cart in product detail and add nav links"
```

---

## Task 20: Run All Tests and Verify Build

- [ ] **Step 1: Run all order-related tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: ALL PASS

- [ ] **Step 2: Run full test suite to check for regressions**

```bash
npx vitest run
```

Expected: ALL PASS (no regressions in existing tests)

- [ ] **Step 3: Verify build compiles**

```bash
npx next build
```

Expected: BUILD SUCCESS (may have warnings, but no errors)

- [ ] **Step 4: Fix any build issues, then commit**

```bash
git add -A
git commit -m "fix(orders): resolve build issues"
```

Only run this if there are fixes needed. If build passes cleanly, skip.
