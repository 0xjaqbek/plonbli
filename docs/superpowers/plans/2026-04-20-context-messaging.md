# Context Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add order-linked and listing-linked conversations so users can message directly from an order or product page without losing context.

**Architecture:** Add `orderId` and `listingId` nullable FK columns to `conversations`. Deduplication in `createConversation` is extended to match on context. Context is displayed in the conversation list and chat header as a clickable link back to the source entity.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, Zod, next-intl, shadcn/ui

---

### Task 1: Add orderId and listingId to conversations schema

**Files:**
- Modify: `src/shared/db/schema/conversations.ts`
- Modify: `src/shared/db/schema/relations.ts`

- [ ] **Step 1: Update conversations.ts**

Replace the file content with:

```ts
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { orders } from "./orders";
import { listings } from "./listings";

export const conversationTypeEnum = pgEnum("conversation_type", [
  "DIRECT",
  "GROUP",
  "CHANNEL",
]);

export const conversations = pgTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  type: conversationTypeEnum("type").notNull(),
  name: text("name"),
  groupId: text("group_id"),
  orderId: text("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  listingId: text("listing_id").references(() => listings.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
```

- [ ] **Step 2: Update conversationsRelations in relations.ts**

Find the `conversationsRelations` block (around line 60):

```ts
export const conversationsRelations = relations(conversations, ({ many }) => ({
  members: many(conversationMembers),
  messages: many(messages),
}));
```

Replace it with:

```ts
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  members: many(conversationMembers),
  messages: many(messages),
  order: one(orders, {
    fields: [conversations.orderId],
    references: [orders.id],
  }),
  listing: one(listings, {
    fields: [conversations.listingId],
    references: [listings.id],
  }),
}));
```

The imports for `orders` and `listings` are already at the top of `relations.ts` (line 25 and line 6 respectively).

---

### Task 2: Generate and apply Drizzle migration

**Files:** `drizzle/` (auto-generated)

- [ ] **Step 1: Generate migration**

```bash
npm run db:generate
```

Expected: A new file appears in `drizzle/` like `0007_*.sql` containing:
```sql
ALTER TABLE "conversations" ADD COLUMN "order_id" text;
ALTER TABLE "conversations" ADD COLUMN "listing_id" text;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;
```

- [ ] **Step 2: Apply migration**

```bash
npm run db:migrate
```

Expected: Migration applied successfully, no errors.

- [ ] **Step 3: Run tests to confirm schema change doesn't break anything**

```bash
npm test
```

Expected: All existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/conversations.ts src/shared/db/schema/relations.ts drizzle/
git commit -m "feat(messaging): add orderId and listingId columns to conversations"
```

---

### Task 3: Update validation schema

**Files:**
- Modify: `src/domains/messaging/schemas/validation.ts`
- Modify: `tests/domains/messaging/schemas/validation.test.ts`

- [ ] **Step 1: Write failing tests for new schema fields**

Add to the `createConversationSchema` describe block in `tests/domains/messaging/schemas/validation.test.ts`:

```ts
  it("accepts direct conversation with orderId", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
      orderId: "order-abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderId).toBe("order-abc");
    }
  });

  it("accepts direct conversation with listingId", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
      listingId: "listing-abc",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.listingId).toBe("listing-abc");
    }
  });

  it("rejects empty string orderId", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
      orderId: "",
    });
    expect(result.success).toBe(false);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/domains/messaging/schemas/validation.test.ts
```

Expected: 3 new tests FAIL.

- [ ] **Step 3: Update createConversationSchema in validation.ts**

Replace the `createConversationSchema` definition:

```ts
export const createConversationSchema = z
  .object({
    type: z.enum(["DIRECT", "GROUP"]),
    name: z.string().max(100).optional(),
    participantIds: z.array(z.string().min(1)),
    orderId: z.string().min(1).optional(),
    listingId: z.string().min(1).optional(),
  })
  .refine(
    (data) => {
      if (data.type === "DIRECT") return data.participantIds.length === 1;
      return data.participantIds.length >= 2;
    },
    {
      message:
        "Rozmowa bezposrednia wymaga 1 uczestnika, grupowa min. 2",
      path: ["participantIds"],
    }
  );
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/domains/messaging/schemas/validation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/messaging/schemas/validation.ts tests/domains/messaging/schemas/validation.test.ts
git commit -m "feat(messaging): add orderId and listingId to createConversationSchema"
```

---

### Task 4: Update create-conversation action

**Files:**
- Modify: `src/domains/messaging/actions/create-conversation.ts`
- Modify: `tests/domains/messaging/actions/create-conversation.test.ts`

- [ ] **Step 1: Write failing tests**

Replace the content of `tests/domains/messaging/actions/create-conversation.test.ts` with the following (keep existing tests, add new ones):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createConversation } from "@/domains/messaging/actions/create-conversation";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockDb = {
    insert: vi.fn().mockReturnValue({ values: mockValues }),
    query: {
      conversationMembers: { findMany: vi.fn() },
      conversations: { findFirst: vi.fn() },
      orders: { findFirst: vi.fn() },
      listings: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("createConversation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes zalogowany");
    }
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: [],
    });

    expect(result.success).toBe(false);
  });

  it("creates conversation and adds members on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.conversationMembers.findMany).mockResolvedValueOnce([]);

    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "conv-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const mockMemberValues = vi.fn().mockResolvedValueOnce([]);
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockMemberValues } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-1");
    }
  });

  it("creates conversation with orderId when user is party to the order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");

    // Order access check passes (user-1 is customerId)
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "user-1",
      farmerId: "user-2",
    } as any);

    // No existing memberships → no deduplication match
    vi.mocked(db.query.conversationMembers.findMany).mockResolvedValueOnce([]);

    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "conv-order-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const mockMemberValues = vi.fn().mockResolvedValueOnce([]);
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockMemberValues } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-order-1");
    }
  });

  it("returns error when user is not party to the order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");

    // Order exists but user-1 is neither customer nor farmer
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "user-3",
      farmerId: "user-2",
    } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Brak dostępu");
    }
  });

  it("returns error when orderId does not exist", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-nonexistent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Brak dostępu");
    }
  });

  it("returns existing conversation when same orderId already has a conversation", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      customerId: "user-1",
      farmerId: "user-2",
    } as any);

    // user-1 is member of conv-existing
    vi.mocked(db.query.conversationMembers.findMany)
      .mockResolvedValueOnce([{ conversationId: "conv-existing" }] as any)
      // user-2 is also a member
      .mockResolvedValueOnce([{ conversationId: "conv-existing", userId: "user-2" }] as any);

    // The conversation matches type=DIRECT and orderId=order-1
    vi.mocked(db.query.conversations.findFirst).mockResolvedValueOnce({
      id: "conv-existing",
      type: "DIRECT",
      orderId: "order-1",
    } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      orderId: "order-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-existing");
    }
    // insert should NOT have been called (reused existing)
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates conversation with listingId when listing exists", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "listing-1",
    } as any);

    vi.mocked(db.query.conversationMembers.findMany).mockResolvedValueOnce([]);

    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "conv-listing-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const mockMemberValues = vi.fn().mockResolvedValueOnce([]);
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockMemberValues } as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      listingId: "listing-1",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-listing-1");
    }
  });

  it("returns error when listingId does not exist", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");

    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
      listingId: "listing-nonexistent",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Ogłoszenie nie istnieje");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
npm test tests/domains/messaging/actions/create-conversation.test.ts
```

Expected: New tests (orderId/listingId cases) FAIL — `db.query.orders` and `db.query.listings` undefined.

- [ ] **Step 3: Implement updated create-conversation.ts**

Replace the full file content:

```ts
"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  conversations,
  conversationMembers,
  orders,
  listings,
} from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createConversationSchema,
  type CreateConversationInput,
} from "../schemas/validation";

type CreateConversationResult =
  | { success: true; conversationId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createConversation(
  input: CreateConversationInput
): Promise<CreateConversationResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createConversationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { type, name, participantIds, orderId, listingId } = parsed.data;
  const currentUserId = session.user.id;

  // Access control for orderId
  if (orderId) {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (
      !order ||
      (order.customerId !== currentUserId && order.farmerId !== currentUserId)
    ) {
      return { success: false, error: "Brak dostępu" };
    }
  }

  // Access control for listingId
  if (listingId) {
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, listingId),
    });
    if (!listing) {
      return { success: false, error: "Ogłoszenie nie istnieje" };
    }
  }

  // For DIRECT conversations, check if one already exists with the same context
  if (type === "DIRECT") {
    const otherUserId = participantIds[0];

    const myMemberships = await db.query.conversationMembers.findMany({
      where: eq(conversationMembers.userId, currentUserId),
    });

    for (const membership of myMemberships) {
      const otherMembership = await db.query.conversationMembers.findMany({
        where: and(
          eq(conversationMembers.conversationId, membership.conversationId),
          eq(conversationMembers.userId, otherUserId)
        ),
      });

      if (otherMembership.length > 0) {
        const contextCondition = orderId
          ? eq(conversations.orderId, orderId)
          : listingId
            ? eq(conversations.listingId, listingId)
            : and(isNull(conversations.orderId), isNull(conversations.listingId));

        const conv = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, membership.conversationId),
            eq(conversations.type, "DIRECT"),
            contextCondition
          ),
        });

        if (conv) {
          return { success: true, conversationId: conv.id };
        }
      }
    }
  }

  // Create new conversation
  const [conversation] = await db
    .insert(conversations)
    .values({
      type,
      name: name ?? null,
      orderId: orderId ?? null,
      listingId: listingId ?? null,
    })
    .returning({ id: conversations.id });

  // Add all members (including current user)
  const allMemberIds = [currentUserId, ...participantIds];
  await db.insert(conversationMembers).values(
    allMemberIds.map((userId, index) => ({
      conversationId: conversation.id,
      userId,
      role: index === 0 ? ("ADMIN" as const) : ("MEMBER" as const),
    }))
  );

  return { success: true, conversationId: conversation.id };
}
```

- [ ] **Step 4: Run all messaging tests**

```bash
npm test tests/domains/messaging/
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/messaging/actions/create-conversation.ts tests/domains/messaging/actions/create-conversation.test.ts
git commit -m "feat(messaging): support orderId and listingId context in createConversation"
```

---

### Task 5: Update getConversations to include context

**Files:**
- Modify: `src/domains/messaging/queries/get-conversations.ts`

- [ ] **Step 1: Update get-conversations.ts**

Replace the file content:

```ts
import { eq, desc, and, ne, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  conversations,
  conversationMembers,
  messages,
  users,
} from "@/shared/db/schema";

export type ConversationContext =
  | { type: "ORDER"; label: string }
  | { type: "LISTING"; label: string }
  | null;

export async function getConversations(userId: string) {
  // Get all conversations the user is a member of
  const memberships = await db
    .select({
      conversationId: conversationMembers.conversationId,
      muted: conversationMembers.muted,
    })
    .from(conversationMembers)
    .where(eq(conversationMembers.userId, userId));

  if (memberships.length === 0) return [];

  const mutedMap = new Map(
    memberships.map((m) => [m.conversationId, m.muted])
  );

  const results = [];

  for (const membership of memberships) {
    const convId = membership.conversationId;

    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, convId),
      with: {
        order: { columns: { orderNumber: true } },
        listing: {
          columns: { price: true },
          with: {
            product: { columns: { name: true } },
          },
        },
      },
    });

    if (!conv) continue;

    // Get last message
    const [lastMessage] = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        senderName: users.name,
        createdAt: messages.createdAt,
        status: messages.status,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, convId))
      .orderBy(desc(messages.createdAt))
      .limit(1);

    // Get unread count
    const [{ count: unreadCount }] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, convId),
          ne(messages.senderId, userId),
          ne(messages.status, "READ")
        )
      );

    // Get other members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      })
      .from(conversationMembers)
      .innerJoin(users, eq(conversationMembers.userId, users.id))
      .where(
        and(
          eq(conversationMembers.conversationId, convId),
          ne(conversationMembers.userId, userId)
        )
      );

    // Build context
    let context: ConversationContext = null;
    if (conv.order) {
      context = { type: "ORDER", label: `#${conv.order.orderNumber}` };
    } else if (conv.listing) {
      context = { type: "LISTING", label: conv.listing.product.name };
    }

    const { order: _order, listing: _listing, ...conversationBase } = conv;

    results.push({
      conversation: conversationBase,
      lastMessage: lastMessage ?? null,
      unreadCount,
      muted: mutedMap.get(convId) ?? false,
      otherMembers: members,
      context,
    });
  }

  // Sort by last message time (most recent first)
  results.sort((a, b) => {
    const aTime =
      a.lastMessage?.createdAt?.getTime() ??
      a.conversation.createdAt.getTime();
    const bTime =
      b.lastMessage?.createdAt?.getTime() ??
      b.conversation.createdAt.getTime();
    return bTime - aTime;
  });

  return results;
}

export type ConversationWithDetails = Awaited<
  ReturnType<typeof getConversations>
>[number];
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass. (No new tests for this query — it's covered by integration behavior.)

- [ ] **Step 3: Commit**

```bash
git add src/domains/messaging/queries/get-conversations.ts
git commit -m "feat(messaging): include order/listing context in getConversations"
```

---

### Task 6: Add translation keys

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add new translation keys**

In `messages/pl.json`, add to the `"messaging"` object:

```json
"orderConversation": "dot. zamówienia",
"listingConversation": "dot. ogłoszenia"
```

And to the `"product"` object:

```json
"askAboutProduct": "Zapytaj o produkt"
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add messages/pl.json
git commit -m "feat(messaging): add context messaging translation keys"
```

---

### Task 7: Update ConversationItem to show context subtitle

**Files:**
- Modify: `src/domains/messaging/components/conversation-item.tsx`

- [ ] **Step 1: Update conversation-item.tsx**

In the JSX, find the inner `div.flex-1` block (around line 77). The current structure is:

```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-center justify-between gap-2">
    <p className="truncate text-sm font-medium">{displayName}</p>
    ...
  </div>
  <div className="flex items-center justify-between gap-2 mt-0.5">
    <p className="truncate text-xs text-muted-foreground">
      {lastMessagePreview ?? t("noMessages")}
    </p>
    ...
  </div>
</div>
```

Replace with:

```tsx
<div className="flex-1 min-w-0">
  <div className="flex items-center justify-between gap-2">
    <p className="truncate text-sm font-medium">{displayName}</p>
    {lastMessage && (
      <span className="text-[10px] text-muted-foreground shrink-0">
        {formatTime(lastMessage.createdAt)}
      </span>
    )}
  </div>
  {item.context && (
    <p className="text-[10px] text-primary truncate">
      {item.context.type === "ORDER"
        ? `${t("orderConversation")} ${item.context.label}`
        : `${t("listingConversation")}: ${item.context.label}`}
    </p>
  )}
  <div className="flex items-center justify-between gap-2 mt-0.5">
    <p className="truncate text-xs text-muted-foreground">
      {lastMessagePreview ?? t("noMessages")}
    </p>
    {unreadCount > 0 && (
      <span className="shrink-0 flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
        {unreadCount}
      </span>
    )}
  </div>
</div>
```

Note: The original `lastMessage` timestamp and `unreadCount` badge were inside the two separate rows — the above preserves them. Only the context subtitle line is new.

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/domains/messaging/components/conversation-item.tsx
git commit -m "feat(messaging): show order/listing context subtitle in conversation list"
```

---

### Task 8: Add context link in chat header

**Files:**
- Modify: `src/app/[locale]/(main)/messages/[id]/page.tsx`

- [ ] **Step 1: Update the conversation page**

Add imports at the top (after existing imports):

```ts
import { orders, listings } from "@/shared/db/schema";
import { Package, Tag } from "lucide-react";
```

After the `otherMembers` query and before `displayName` (around line 53), add context data fetching:

```ts
// Fetch context data if conversation is linked to an order or listing
type ContextData =
  | { type: "ORDER"; label: string; href: string }
  | { type: "LISTING"; label: string; href: string }
  | null;

let contextData: ContextData = null;

if (conversation.orderId) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, conversation.orderId),
    columns: { orderNumber: true, customerId: true },
  });
  if (order) {
    const isCustomerView = order.customerId === session.user.id;
    contextData = {
      type: "ORDER",
      label: `#${order.orderNumber}`,
      href: isCustomerView
        ? `/orders/${conversation.orderId}`
        : `/farmer/orders/${conversation.orderId}`,
    };
  }
} else if (conversation.listingId) {
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, conversation.listingId),
    with: { product: { columns: { name: true } } },
    columns: {},
  });
  if (listing) {
    contextData = {
      type: "LISTING",
      label: listing.product.name,
      href: `/marketplace/${conversation.listingId}`,
    };
  }
}
```

Then in the JSX, find the chat header `<div>` (around line 109):

```tsx
<div>
  <p className="font-medium">{displayName}</p>
  {conversation.type === "GROUP" && (
    <p className="text-xs text-muted-foreground">
      {otherMembers.length + 1} {t("membersCount")}
    </p>
  )}
</div>
```

Replace with:

```tsx
<div>
  <p className="font-medium">{displayName}</p>
  {conversation.type === "GROUP" && (
    <p className="text-xs text-muted-foreground">
      {otherMembers.length + 1} {t("membersCount")}
    </p>
  )}
  {contextData && (
    <Link
      href={contextData.href}
      className="text-xs text-primary hover:underline flex items-center gap-1"
    >
      {contextData.type === "ORDER" ? (
        <Package className="h-3 w-3" />
      ) : (
        <Tag className="h-3 w-3" />
      )}
      {contextData.label}
    </Link>
  )}
</div>
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/\(main\)/messages/[id]/page.tsx
git commit -m "feat(messaging): show context link in chat header"
```

---

### Task 9: Fix order-detail "Message to Farmer" button

**Files:**
- Modify: `src/domains/orders/components/order-detail/order-detail.tsx`

- [ ] **Step 1: Update order-detail.tsx**

Add imports at the top (after existing imports):

```ts
import { createConversation } from "@/domains/messaging";
```

Find `handleComplete` function and add a new handler below it:

```ts
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
```

Find the existing "message to farmer" button (around line 197):

```tsx
<Button
  variant="outline"
  onClick={() => router.push(`/messages`)}
  className="flex items-center gap-2"
>
  <MessageCircle className="h-4 w-4" />
  {t("messageToFarmer")}
</Button>
```

Replace with:

```tsx
<Button
  variant="outline"
  onClick={handleMessageAboutOrder}
  disabled={isPending}
  className="flex items-center gap-2"
>
  <MessageCircle className="h-4 w-4" />
  {t("messageToFarmer")}
</Button>
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/components/order-detail/order-detail.tsx
git commit -m "feat(orders): link 'message to farmer' button to order-specific conversation"
```

---

### Task 10: Add "Ask about product" button to product-detail

**Files:**
- Modify: `src/domains/marketplace/components/product-detail.tsx`

- [ ] **Step 1: Update product-detail.tsx**

Add import at the top (after existing imports):

```ts
import { createConversation } from "@/domains/messaging";
```

Find `handleAddToCart` function and add a new handler below it:

```ts
function handleAskAboutProduct() {
  startTransition(async () => {
    const result = await createConversation({
      type: "DIRECT",
      participantIds: [product.farmer.id],
      listingId: listing.id,
    });
    if (result.success) {
      router.push(`/messages/${result.conversationId}`);
    }
  });
}
```

Find the `!isOwner` section (around line 239):

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
      {cartSuccess ? tOrders("addedToCart") : tOrders("addToCart")}
    </Button>
  </div>
)}
```

Replace with:

```tsx
{!isOwner && (
  <div className="flex items-center gap-3 flex-wrap">
    <Input
      type="number"
      min={1}
      value={cartQty}
      onChange={(e) => setCartQty(Number(e.target.value))}
      className="w-20"
    />
    <Button onClick={handleAddToCart} disabled={isPending}>
      {cartSuccess ? tOrders("addedToCart") : tOrders("addToCart")}
    </Button>
    <Button
      variant="outline"
      onClick={handleAskAboutProduct}
      disabled={isPending}
      className="flex items-center gap-2"
    >
      <MessageCircle className="h-4 w-4" />
      {t("askAboutProduct")}
    </Button>
  </div>
)}
```

Also add `MessageCircle` to the lucide-react import line (it's not currently imported in product-detail.tsx). Find:

```ts
import { MapPin, Truck, Package, User } from "lucide-react";
```

Replace with:

```ts
import { MapPin, Truck, Package, User, MessageCircle } from "lucide-react";
```

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/domains/marketplace/components/product-detail.tsx
git commit -m "feat(marketplace): add 'ask about product' button linking to listing conversation"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```

Expected: All tests pass. Count should be ≥ 241 (existing) + new tests added in Tasks 3 and 4.

- [ ] **Step 2: Verify TypeScript compilation**

```bash
npx tsc --noEmit
```

Expected: No type errors.
