# Notification Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dot-badge indicators to messages and orders icons in NavBar to inform users of unread messages and unseen order status changes.

**Architecture:** Add two boolean columns (`customerHasSeen`, `farmerHasSeen`) to the `orders` table. Each order action resets the relevant flag when the other party takes an action. A new query `hasUnseenOrderChanges` checks if the user has any unseen changes (in either role — customer, farmer, or both). The main layout fetches this alongside the existing `hasUnreadMessages` and passes both to NavBar.

**Tech Stack:** Next.js 15 (Server Actions, Server Components), Drizzle ORM, PostgreSQL (Neon), Vitest

---

## File Map

**New files:**
- `src/domains/orders/queries/has-unseen-order-changes.ts` — boolean query, same pattern as `has-unread-messages.ts`
- `src/domains/orders/actions/mark-order-seen.ts` — Server Action, marks both/either flag true when user opens order
- `tests/domains/orders/queries/has-unseen-order-changes.test.ts`
- `tests/domains/orders/actions/mark-order-seen.test.ts`

**Modified files:**
- `src/shared/db/schema/orders.ts` — add `customerHasSeen`, `farmerHasSeen` columns
- `src/domains/orders/actions/create-order.ts` — set `farmerHasSeen: false` on insert
- `src/domains/orders/actions/submit-payment-proof.ts` — set `farmerHasSeen: false`
- `src/domains/orders/actions/accept-modification.ts` — set `farmerHasSeen: false`
- `src/domains/orders/actions/cancel-order.ts` — set `farmerHasSeen: false` (customer) or `customerHasSeen: false` (farmer)
- `src/domains/orders/actions/modify-order.ts` — set `customerHasSeen: false`
- `src/domains/orders/actions/confirm-order.ts` — set `customerHasSeen: false`
- `src/domains/orders/actions/update-order-status.ts` — set `customerHasSeen: false` in both `updateOrderStatus` and `markAsShipped`
- `src/domains/orders/index.ts` — export new query and action
- `src/app/[locale]/(main)/layout.tsx` — fetch `hasUnseenOrderChanges`, pass to NavBar
- `src/shared/ui/nav-bar.tsx` — add `hasUnseenOrders` prop, dot on Package icon
- `src/app/[locale]/(main)/orders/[id]/page.tsx` — call `markOrderSeen`
- `src/app/[locale]/(main)/farmer/orders/[id]/page.tsx` — call `markOrderSeen`

---

## Task 1: Add columns to DB schema and generate migration

**Files:**
- Modify: `src/shared/db/schema/orders.ts`

- [ ] **Step 1: Add the two boolean columns to orders table**

In `src/shared/db/schema/orders.ts`, add `customerHasSeen` and `farmerHasSeen` to the `orders` pgTable definition, after the `cancelledBy` column:

```ts
// existing:
cancelledBy: cancelledByEnum("cancelled_by"),
// add after:
customerHasSeen: boolean("customer_has_seen").notNull().default(true),
farmerHasSeen: boolean("farmer_has_seen").notNull().default(true),
```

Full import line at top of file needs `boolean` added:
```ts
import { pgTable, text, numeric, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
```

- [ ] **Step 2: Generate migration**

```bash
npx drizzle-kit generate
```

Expected: creates `drizzle/0005_*.sql` with:
```sql
ALTER TABLE "orders" ADD COLUMN "customer_has_seen" boolean DEFAULT true NOT NULL;
ALTER TABLE "orders" ADD COLUMN "farmer_has_seen" boolean DEFAULT true NOT NULL;
```

- [ ] **Step 3: Apply migration**

```bash
npx drizzle-kit migrate
```

Expected: `All migrations applied` (or similar success message)

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/shared/db/schema/orders.ts drizzle/
git commit -m "feat(db): add customerHasSeen and farmerHasSeen columns to orders"
```

---

## Task 2: Implement `hasUnseenOrderChanges` query (TDD)

**Files:**
- Create: `tests/domains/orders/queries/has-unseen-order-changes.test.ts`
- Create: `src/domains/orders/queries/has-unseen-order-changes.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/domains/orders/queries/has-unseen-order-changes.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    select: vi.fn(),
  };
  return { db: mockDb };
});

describe("hasUnseenOrderChanges", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns true when customer has unseen changes", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce([{ id: "order-1" }]),
      }),
    } as any);

    const { hasUnseenOrderChanges } = await import(
      "@/domains/orders/queries/has-unseen-order-changes"
    );
    const result = await hasUnseenOrderChanges("user-1");
    expect(result).toBe(true);
  });

  it("returns false when no unseen changes", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce([]),
      }),
    } as any);

    const { hasUnseenOrderChanges } = await import(
      "@/domains/orders/queries/has-unseen-order-changes"
    );
    const result = await hasUnseenOrderChanges("user-1");
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/domains/orders/queries/has-unseen-order-changes.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the query**

Create `src/domains/orders/queries/has-unseen-order-changes.ts`:

```ts
import { or, and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders } from "@/shared/db/schema";

export async function hasUnseenOrderChanges(userId: string): Promise<boolean> {
  const result = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      or(
        and(eq(orders.customerId, userId), eq(orders.customerHasSeen, false)),
        and(eq(orders.farmerId, userId), eq(orders.farmerHasSeen, false))
      )
    )
    .limit(1);

  return result.length > 0;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/domains/orders/queries/has-unseen-order-changes.test.ts
```

Expected: PASS — 2 tests

- [ ] **Step 5: Commit**

```bash
git add src/domains/orders/queries/has-unseen-order-changes.ts tests/domains/orders/queries/has-unseen-order-changes.test.ts
git commit -m "feat(orders): add hasUnseenOrderChanges query"
```

---

## Task 3: Implement `markOrderSeen` action (TDD)

**Files:**
- Create: `tests/domains/orders/actions/mark-order-seen.test.ts`
- Create: `src/domains/orders/actions/mark-order-seen.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/domains/orders/actions/mark-order-seen.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    query: {
      orders: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("markOrderSeen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when order not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce(undefined);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(false);
  });

  it("returns error when user is not participant", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "other-user" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
    } as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("returns success for customer participant", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "customer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
    } as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(true);
  });

  it("returns success for farmer participant", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "farmer-1" } } as any);
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "customer-1",
      farmerId: "farmer-1",
    } as any);

    const { markOrderSeen } = await import(
      "@/domains/orders/actions/mark-order-seen"
    );
    const result = await markOrderSeen("order-1");
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run tests/domains/orders/actions/mark-order-seen.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement the action**

Create `src/domains/orders/actions/mark-order-seen.ts`:

```ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { orders } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type MarkSeenResult = { success: true } | { success: false; error: string };

export async function markOrderSeen(orderId: string): Promise<MarkSeenResult> {
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

  const isCustomer = order.customerId === session.user.id;
  const isFarmer = order.farmerId === session.user.id;

  if (!isCustomer && !isFarmer) {
    return { success: false, error: "Brak uprawnien" };
  }

  if (isCustomer) {
    await db
      .update(orders)
      .set({ customerHasSeen: true })
      .where(eq(orders.id, orderId));
  }

  if (isFarmer) {
    await db
      .update(orders)
      .set({ farmerHasSeen: true })
      .where(eq(orders.id, orderId));
  }

  return { success: true };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx vitest run tests/domains/orders/actions/mark-order-seen.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/domains/orders/actions/mark-order-seen.ts tests/domains/orders/actions/mark-order-seen.test.ts
git commit -m "feat(orders): add markOrderSeen action"
```

---

## Task 4: Reset flags in `create-order`

**Files:**
- Modify: `src/domains/orders/actions/create-order.ts`
- Test: `tests/domains/orders/actions/create-order.test.ts`

- [ ] **Step 1: Add `farmerHasSeen: false` to the order insert**

In `src/domains/orders/actions/create-order.ts`, inside the transaction `tx.insert(orders).values({...})`, add:

```ts
farmerHasSeen: false,
```

Full values object after change:
```ts
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
  farmerHasSeen: false,
})
```

- [ ] **Step 2: Run all order tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: all existing tests pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/actions/create-order.ts
git commit -m "feat(orders): reset farmerHasSeen on order creation"
```

---

## Task 5: Reset flags in `submit-payment-proof`

**Files:**
- Modify: `src/domains/orders/actions/submit-payment-proof.ts`

- [ ] **Step 1: Add `farmerHasSeen: false` update after the proof insert**

In `src/domains/orders/actions/submit-payment-proof.ts`, after the `db.insert(paymentProofs)...` call, add:

```ts
await db
  .update(orders)
  .set({ farmerHasSeen: false })
  .where(eq(orders.id, orderId));
```

Add `orders` to the import if not already present (it's already imported):
```ts
import { orders, paymentProofs } from "@/shared/db/schema";
```

Also import `eq` from drizzle-orm if not present (it's already imported).

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/actions/submit-payment-proof.ts
git commit -m "feat(orders): reset farmerHasSeen on payment proof submission"
```

---

## Task 6: Reset flags in `accept-modification`

**Files:**
- Modify: `src/domains/orders/actions/accept-modification.ts`

- [ ] **Step 1: Add `farmerHasSeen: false` to the transaction update**

In `src/domains/orders/actions/accept-modification.ts`, inside the transaction, change the `tx.update(orders).set(...)` call to:

```ts
await tx
  .update(orders)
  .set({ status: "CONFIRMED", farmerHasSeen: false })
  .where(eq(orders.id, orderId));
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/actions/accept-modification.ts
git commit -m "feat(orders): reset farmerHasSeen on modification acceptance"
```

---

## Task 7: Reset flags in `cancel-order`

**Files:**
- Modify: `src/domains/orders/actions/cancel-order.ts`

- [ ] **Step 1: Add flag reset to the cancel transaction**

In `src/domains/orders/actions/cancel-order.ts`, inside the transaction, change the `tx.update(orders).set(...)` call to:

```ts
await tx
  .update(orders)
  .set({
    status: "CANCELLED",
    cancellationReason: reason ?? null,
    cancelledBy: isFarmer ? "FARMER" : "CUSTOMER",
    customerHasSeen: isFarmer ? false : true,
    farmerHasSeen: isCustomer ? false : true,
  })
  .where(eq(orders.id, orderId));
```

Logic: if farmer cancels → customer needs to see it (`customerHasSeen: false`). If customer cancels → farmer needs to see it (`farmerHasSeen: false`). The "true" branch never actually triggers in practice (since only one party cancels at a time), but this is the explicit/safe form.

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/actions/cancel-order.ts
git commit -m "feat(orders): reset seen flag for opposite party on cancellation"
```

---

## Task 8: Reset flags in `modify-order`

**Files:**
- Modify: `src/domains/orders/actions/modify-order.ts`

- [ ] **Step 1: Add `customerHasSeen: false` to the transaction update**

In `src/domains/orders/actions/modify-order.ts`, inside the transaction, find the `tx.update(orders).set({ status: "MODIFIED" })` call and add:

```ts
await tx
  .update(orders)
  .set({ status: "MODIFIED", customerHasSeen: false })
  .where(eq(orders.id, orderId));
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/actions/modify-order.ts
git commit -m "feat(orders): reset customerHasSeen on order modification"
```

---

## Task 9: Reset flags in `confirm-order`

**Files:**
- Modify: `src/domains/orders/actions/confirm-order.ts`

- [ ] **Step 1: Add `customerHasSeen: false` to the transaction update**

In `src/domains/orders/actions/confirm-order.ts`, inside the transaction, change:

```ts
await tx
  .update(orders)
  .set({ status: "CONFIRMED", customerHasSeen: false })
  .where(eq(orders.id, orderId));
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/actions/confirm-order.ts
git commit -m "feat(orders): reset customerHasSeen on order confirmation"
```

---

## Task 10: Reset flags in `update-order-status` and `markAsShipped`

**Files:**
- Modify: `src/domains/orders/actions/update-order-status.ts`

- [ ] **Step 1: Add `customerHasSeen: false` in `updateOrderStatus`**

In `updateOrderStatus`, inside the transaction, change:

```ts
await tx
  .update(orders)
  .set({ status: status as any, customerHasSeen: false })
  .where(eq(orders.id, orderId));
```

- [ ] **Step 2: Add `customerHasSeen: false` in `markAsShipped`**

In `markAsShipped`, inside the transaction, change:

```ts
await tx
  .update(orders)
  .set({
    status: "SHIPPED",
    trackingNumber,
    trackingUrl: trackingUrl ?? null,
    customerHasSeen: false,
  })
  .where(eq(orders.id, orderId));
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/domains/orders/
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/domains/orders/actions/update-order-status.ts
git commit -m "feat(orders): reset customerHasSeen on status updates and shipping"
```

---

## Task 11: Update exports, NavBar and layout

**Files:**
- Modify: `src/domains/orders/index.ts`
- Modify: `src/shared/ui/nav-bar.tsx`
- Modify: `src/app/[locale]/(main)/layout.tsx`

- [ ] **Step 1: Export new query and action from domain index**

In `src/domains/orders/index.ts`, add:

```ts
export { hasUnseenOrderChanges } from "./queries/has-unseen-order-changes";
export { markOrderSeen } from "./actions/mark-order-seen";
```

- [ ] **Step 2: Add `hasUnseenOrders` prop to NavBar**

In `src/shared/ui/nav-bar.tsx`:

Change `NavBarProps` interface:
```ts
interface NavBarProps {
  hasUnread?: boolean;
  hasUnseenOrders?: boolean;
}
```

Change function signature:
```ts
export function NavBar({ hasUnread, hasUnseenOrders }: NavBarProps) {
```

In the **desktop top bar** (`header.hidden.md:flex`), inside the map over `allNavItems`, add badge for orders alongside the existing messages badge:

```tsx
<span className="relative">
  <Icon className="h-4 w-4" />
  {hasUnread && href === "/messages" && (
    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
  )}
  {hasUnseenOrders && href === "/orders" && (
    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
  )}
</span>
```

In the **mobile top bar**, inside the map over `topRightItems`, add badge for orders:

```tsx
<Icon className="h-5 w-5" />
{hasUnread && href === "/messages" && (
  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
)}
{hasUnseenOrders && href === "/orders" && (
  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
)}
```

- [ ] **Step 3: Update layout to fetch and pass `hasUnseenOrders`**

In `src/app/[locale]/(main)/layout.tsx`:

```ts
import { hasUnreadMessages } from "@/domains/messaging/queries/has-unread-messages";
import { hasUnseenOrderChanges } from "@/domains/orders/queries/has-unseen-order-changes";
```

Inside `MainLayout`:
```ts
const [hasUnread, hasUnseenOrders] = await Promise.all([
  hasUnreadMessages(session.user!.id!),
  hasUnseenOrderChanges(session.user!.id!),
]);
```

Pass to NavBar:
```tsx
<NavBar hasUnread={hasUnread} hasUnseenOrders={hasUnseenOrders} />
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/domains/orders/index.ts src/shared/ui/nav-bar.tsx src/app/[locale]/\(main\)/layout.tsx
git commit -m "feat(nav): add unseen orders badge to NavBar"
```

---

## Task 12: Mark orders as seen on detail pages

**Files:**
- Modify: `src/app/[locale]/(main)/orders/[id]/page.tsx`
- Modify: `src/app/[locale]/(main)/farmer/orders/[id]/page.tsx`

- [ ] **Step 1: Call `markOrderSeen` in customer order detail page**

In `src/app/[locale]/(main)/orders/[id]/page.tsx`, add import and call after the order is fetched and validated:

```ts
import { markOrderSeen } from "@/domains/orders/actions/mark-order-seen";
```

Add call after authorization check:
```ts
if (!order) notFound();
if (order.customerId !== session.user.id && order.farmerId !== session.user.id) notFound();

await markOrderSeen(id);
```

- [ ] **Step 2: Call `markOrderSeen` in farmer order detail page**

In `src/app/[locale]/(main)/farmer/orders/[id]/page.tsx`, add the same import and call:

```ts
import { markOrderSeen } from "@/domains/orders/actions/mark-order-seen";
```

```ts
if (!order) notFound();
if (order.farmerId !== session.user.id) notFound();

await markOrderSeen(id);
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/\(main\)/orders/[id]/page.tsx src/app/[locale]/\(main\)/farmer/orders/[id]/page.tsx
git commit -m "feat(orders): mark order as seen when detail page is opened"
```
