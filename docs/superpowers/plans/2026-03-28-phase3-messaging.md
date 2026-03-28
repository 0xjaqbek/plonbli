# Phase 3: Messaging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time messaging system with 1:1 and group conversations, message status tracking, and a responsive chat UI.

**Architecture:** Extends the monolithic Next.js 15 app with a new `messaging` domain. Conversations, members, and messages stored in PostgreSQL via Drizzle. Real-time updates via polling (interval-based refetch in client components) — designed for easy swap to WebSockets/Pusher later. Server Actions for mutations, Server Components for initial data loading. All UI strings via next-intl.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL (Neon), Zod, next-intl, Vitest

---

## File Structure

```
src/
  domains/
    messaging/
      index.ts                              # barrel export
      schemas/validation.ts                 # Zod schemas (create conversation, send message)
      actions/create-conversation.ts        # server action: create or find direct conversation
      actions/send-message.ts               # server action: send message in conversation
      actions/mark-as-read.ts               # server action: mark messages as read
      queries/get-conversations.ts          # list user's conversations with last message
      queries/get-messages.ts               # messages for a conversation with pagination
      components/conversation-list.tsx      # sidebar: list of conversations
      components/conversation-item.tsx      # single conversation row in list
      components/chat-view.tsx              # chat messages + input area
      components/message-bubble.tsx         # single message display
      components/new-conversation-dialog.tsx # dialog to start new conversation
  shared/
    db/schema/
      conversations.ts                      # conversations table + type enum
      conversation-members.ts               # conversation_members table + role enum
      messages.ts                           # messages table + status enum
      relations.ts                          # updated with messaging relations
      index.ts                              # updated barrel export
    ui/
      dialog.tsx                            # shadcn dialog component
      avatar.tsx                            # shadcn avatar component
      scroll-area.tsx                       # shadcn scroll-area component
  app/[locale]/(main)/
    messages/
      page.tsx                              # conversation list (mobile) / split view (desktop)
      [id]/page.tsx                         # conversation detail
messages/
  pl.json                                   # updated with messaging translations
tests/
  domains/
    messaging/
      schemas/validation.test.ts
      actions/send-message.test.ts
      actions/create-conversation.test.ts
```

---

## Task 1: Messaging Schema — Conversations, Members, Messages

**Files:**
- Create: `src/shared/db/schema/conversations.ts`
- Create: `src/shared/db/schema/conversation-members.ts`
- Create: `src/shared/db/schema/messages.ts`
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create conversations table schema**

Create `src/shared/db/schema/conversations.ts`:

```typescript
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

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

- [ ] **Step 2: Create conversation members table schema**

Create `src/shared/db/schema/conversation-members.ts`:

```typescript
import {
  pgTable,
  text,
  boolean,
  timestamp,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { users } from "./users";

export const memberRoleEnum = pgEnum("member_role", ["MEMBER", "ADMIN"]);

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("MEMBER"),
    muted: boolean("muted").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
  ]
);

export type ConversationMember = typeof conversationMembers.$inferSelect;
export type NewConversationMember = typeof conversationMembers.$inferInsert;
```

- [ ] **Step 3: Create messages table schema**

Create `src/shared/db/schema/messages.ts`:

```typescript
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { conversations } from "./conversations";
import { users } from "./users";

export const messageStatusEnum = pgEnum("message_status", [
  "SENT",
  "DELIVERED",
  "READ",
]);

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: text("sender_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  images: text("images").array().notNull().default([]),
  status: messageStatusEnum("status").notNull().default("SENT"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
```

- [ ] **Step 4: Update relations file with messaging relations**

Replace the full content of `src/shared/db/schema/relations.ts` with:

```typescript
import { relations } from "drizzle-orm";
import { users } from "./users";
import { categories } from "./categories";
import { products } from "./products";
import { listings } from "./listings";
import { conversations } from "./conversations";
import { conversationMembers } from "./conversation-members";
import { messages } from "./messages";

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  farmer: one(users, {
    fields: [products.farmerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  product: one(products, {
    fields: [listings.productId],
    references: [products.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  members: many(conversationMembers),
  messages: many(messages),
}));

export const conversationMembersRelations = relations(
  conversationMembers,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMembers.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationMembers.userId],
      references: [users.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 5: Update schema barrel export**

Replace the full content of `src/shared/db/schema/index.ts` with:

```typescript
export { users, userRoleEnum, type User, type NewUser } from "./users";
export { authAccounts, type AuthAccount } from "./auth-accounts";
export {
  sessions,
  verificationTokens,
  type Session,
} from "./sessions";
export { categories, type Category, type NewCategory } from "./categories";
export {
  products,
  farmingMethodEnum,
  type Product,
  type NewProduct,
} from "./products";
export {
  listings,
  unitEnum,
  availabilityEnum,
  type Listing,
  type NewListing,
  type DeliveryOption,
} from "./listings";
export {
  conversations,
  conversationTypeEnum,
  type Conversation,
  type NewConversation,
} from "./conversations";
export {
  conversationMembers,
  memberRoleEnum,
  type ConversationMember,
  type NewConversationMember,
} from "./conversation-members";
export {
  messages,
  messageStatusEnum,
  type Message,
  type NewMessage,
} from "./messages";
export {
  categoriesRelations,
  productsRelations,
  listingsRelations,
  conversationsRelations,
  conversationMembersRelations,
  messagesRelations,
} from "./relations";
```

- [ ] **Step 6: Push schema to database**

Run: `npx drizzle-kit push`
Expected: `Changes applied` with new tables created.

- [ ] **Step 7: Commit**

```bash
git add src/shared/db/schema/conversations.ts src/shared/db/schema/conversation-members.ts src/shared/db/schema/messages.ts src/shared/db/schema/relations.ts src/shared/db/schema/index.ts
git commit -m "feat: add messaging schema — conversations, members, messages tables"
```

---

## Task 2: Validation Schemas + Tests

**Files:**
- Create: `src/domains/messaging/schemas/validation.ts`
- Create: `tests/domains/messaging/schemas/validation.test.ts`

- [ ] **Step 1: Write failing tests for validation schemas**

Create `tests/domains/messaging/schemas/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  sendMessageSchema,
  createConversationSchema,
} from "@/domains/messaging/schemas/validation";

describe("sendMessageSchema", () => {
  it("accepts valid message with content", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "Cześć!",
    });
    expect(result.success).toBe(true);
  });

  it("accepts message with images", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "Zdjęcia produktu",
      images: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing conversationId", () => {
    const result = sendMessageSchema.safeParse({
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 5 images", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "Dużo zdjęć",
      images: [
        "https://example.com/1.jpg",
        "https://example.com/2.jpg",
        "https://example.com/3.jpg",
        "https://example.com/4.jpg",
        "https://example.com/5.jpg",
        "https://example.com/6.jpg",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 5000 characters", () => {
    const result = sendMessageSchema.safeParse({
      conversationId: "conv-123",
      content: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe("createConversationSchema", () => {
  it("accepts valid direct conversation", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid group conversation with name", () => {
    const result = createConversationSchema.safeParse({
      type: "GROUP",
      name: "Zakupy grupowe",
      participantIds: ["user-1", "user-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects direct conversation with no participants", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects direct conversation with more than 1 participant", () => {
    const result = createConversationSchema.safeParse({
      type: "DIRECT",
      participantIds: ["user-1", "user-2"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects group conversation with fewer than 2 participants", () => {
    const result = createConversationSchema.safeParse({
      type: "GROUP",
      name: "Grupa",
      participantIds: ["user-1"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createConversationSchema.safeParse({
      type: "INVALID",
      participantIds: ["user-1"],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/domains/messaging/schemas/validation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement validation schemas**

Create `src/domains/messaging/schemas/validation.ts`:

```typescript
import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().min(1, "Wiadomosc nie moze byc pusta").max(5000),
  images: z.array(z.string().url()).max(5).default([]),
});

export const createConversationSchema = z
  .object({
    type: z.enum(["DIRECT", "GROUP"]),
    name: z.string().max(100).optional(),
    participantIds: z.array(z.string().min(1)),
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

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<
  typeof createConversationSchema
>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/domains/messaging/schemas/validation.test.ts`
Expected: all 12 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/messaging/schemas/validation.ts tests/domains/messaging/schemas/validation.test.ts
git commit -m "feat: add messaging Zod validation schemas with tests"
```

---

## Task 3: i18n — Messaging Translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add messaging translations**

Add the following section to `messages/pl.json` after the `"farmer"` block (before the closing `}`):

```json
  "messaging": {
    "title": "Wiadomosci",
    "conversations": "Rozmowy",
    "newConversation": "Nowa rozmowa",
    "typeMessage": "Napisz wiadomosc...",
    "send": "Wyslij",
    "sent": "Wyslano",
    "delivered": "Dostarczono",
    "read": "Przeczytane",
    "typing": "pisze...",
    "noConversations": "Brak rozmow. Rozpocznij nowa rozmowe!",
    "noMessages": "Brak wiadomosci. Napisz pierwsza wiadomosc!",
    "startConversation": "Rozpocznij rozmowe",
    "selectUser": "Wybierz uzytkownika",
    "searchUsers": "Szukaj uzytkownikow...",
    "groupName": "Nazwa grupy",
    "directConversation": "Rozmowa bezposrednia",
    "groupConversation": "Rozmowa grupowa",
    "you": "Ty",
    "today": "Dzisiaj",
    "yesterday": "Wczoraj",
    "membersCount": "czlonkow",
    "online": "Online",
    "offline": "Offline",
    "mute": "Wycisz",
    "unmute": "Wlacz powiadomienia",
    "deleteConversation": "Usun rozmowe",
    "errorNotMember": "Nie jestes czlonkiem tej rozmowy",
    "errorNotLoggedIn": "Nie jestes zalogowany",
    "conversationExists": "Rozmowa juz istnieje"
  }
```

- [ ] **Step 2: Commit**

```bash
git add messages/pl.json
git commit -m "feat: add messaging i18n translations (Polish)"
```

---

## Task 4: Server Actions — Create Conversation + Tests

**Files:**
- Create: `src/domains/messaging/actions/create-conversation.ts`
- Create: `tests/domains/messaging/actions/create-conversation.test.ts`

- [ ] **Step 1: Write failing tests for create conversation**

Create `tests/domains/messaging/actions/create-conversation.test.ts`:

```typescript
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
    select: vi.fn(),
    query: {
      conversationMembers: { findMany: vi.fn() },
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
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as never);

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
    } as never);

    const { db } = await import("@/shared/db");

    // Mock: no existing direct conversation found
    vi.mocked(db.query.conversationMembers.findMany).mockResolvedValueOnce([]);

    // Mock: insert conversation returns id
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "conv-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({
      values: mockValues,
    } as never);

    // Mock: insert members
    const mockMemberValues = vi.fn().mockResolvedValueOnce([]);
    vi.mocked(db.insert).mockReturnValueOnce({
      values: mockMemberValues,
    } as never);

    const result = await createConversation({
      type: "DIRECT",
      participantIds: ["user-2"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.conversationId).toBe("conv-1");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/domains/messaging/actions/create-conversation.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement create conversation action**

Create `src/domains/messaging/actions/create-conversation.ts`:

```typescript
"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  conversations,
  conversationMembers,
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

  const { type, name, participantIds } = parsed.data;
  const currentUserId = session.user.id;

  // For DIRECT conversations, check if one already exists between these users
  if (type === "DIRECT") {
    const otherUserId = participantIds[0];

    // Find conversations where current user is a member
    const myConversations = await db.query.conversationMembers.findMany({
      where: eq(conversationMembers.userId, currentUserId),
    });

    for (const membership of myConversations) {
      // Check if the other user is also in this conversation
      // and the conversation is DIRECT type
      const otherMembership = await db.query.conversationMembers.findMany({
        where: and(
          eq(conversationMembers.conversationId, membership.conversationId),
          eq(conversationMembers.userId, otherUserId)
        ),
      });

      if (otherMembership.length > 0) {
        const conv = await db.query.conversations.findFirst({
          where: and(
            eq(conversations.id, membership.conversationId),
            eq(conversations.type, "DIRECT")
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/domains/messaging/actions/create-conversation.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/messaging/actions/create-conversation.ts tests/domains/messaging/actions/create-conversation.test.ts
git commit -m "feat: add create conversation server action with duplicate detection"
```

---

## Task 5: Server Actions — Send Message + Mark as Read + Tests

**Files:**
- Create: `src/domains/messaging/actions/send-message.ts`
- Create: `src/domains/messaging/actions/mark-as-read.ts`
- Create: `tests/domains/messaging/actions/send-message.test.ts`

- [ ] **Step 1: Write failing tests for send message**

Create `tests/domains/messaging/actions/send-message.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendMessage } from "@/domains/messaging/actions/send-message";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
    query: {
      conversationMembers: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as never);

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "Hello",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns error when user is not a member", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as never);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.conversationMembers.findFirst).mockResolvedValueOnce(
      undefined
    );

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "Hello",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as never);

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "",
    });

    expect(result.success).toBe(false);
  });

  it("sends message on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as never);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.conversationMembers.findFirst).mockResolvedValueOnce({
      conversationId: "conv-1",
      userId: "user-1",
      role: "MEMBER",
      muted: false,
      joinedAt: new Date(),
    });

    const mockReturning = vi
      .fn()
      .mockResolvedValueOnce([{ id: "msg-1", createdAt: new Date() }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({
      values: mockValues,
    } as never);

    // Mock update for conversation updatedAt
    vi.mocked(db.update).mockReturnValueOnce({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValueOnce(undefined),
      }),
    } as never);

    const result = await sendMessage({
      conversationId: "conv-1",
      content: "Cześć!",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.messageId).toBe("msg-1");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/domains/messaging/actions/send-message.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement send message action**

Create `src/domains/messaging/actions/send-message.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  messages,
  conversations,
  conversationMembers,
} from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  sendMessageSchema,
  type SendMessageInput,
} from "../schemas/validation";

type SendMessageResult =
  | { success: true; messageId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { conversationId, content, images } = parsed.data;

  // Verify user is a member of this conversation
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return { success: false, error: "Nie jestes czlonkiem tej rozmowy" };
  }

  // Insert message
  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: session.user.id,
      content,
      images,
    })
    .returning({ id: messages.id, createdAt: messages.createdAt });

  // Update conversation's updatedAt timestamp
  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  return { success: true, messageId: message.id };
}
```

- [ ] **Step 4: Implement mark as read action**

Create `src/domains/messaging/actions/mark-as-read.ts`:

```typescript
"use server";

import { eq, and, ne } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages, conversationMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

export async function markAsRead(
  conversationId: string
): Promise<{ success: boolean }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false };
  }

  // Verify membership
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return { success: false };
  }

  // Mark all messages in this conversation as READ (except own messages)
  await db
    .update(messages)
    .set({ status: "READ" })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, session.user.id),
        ne(messages.status, "READ")
      )
    );

  return { success: true };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/domains/messaging/actions/send-message.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/domains/messaging/actions/send-message.ts src/domains/messaging/actions/mark-as-read.ts tests/domains/messaging/actions/send-message.test.ts
git commit -m "feat: add send message and mark-as-read server actions"
```

---

## Task 6: Queries — Get Conversations + Get Messages

**Files:**
- Create: `src/domains/messaging/queries/get-conversations.ts`
- Create: `src/domains/messaging/queries/get-messages.ts`

- [ ] **Step 1: Create get-conversations query**

Create `src/domains/messaging/queries/get-conversations.ts`:

```typescript
import { eq, desc, and, ne, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  conversations,
  conversationMembers,
  messages,
  users,
} from "@/shared/db/schema";

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

  const conversationIds = memberships.map((m) => m.conversationId);
  const mutedMap = new Map(
    memberships.map((m) => [m.conversationId, m.muted])
  );

  // Get conversations with their last message and members
  const results = [];

  for (const convId of conversationIds) {
    const conv = await db.query.conversations.findFirst({
      where: eq(conversations.id, convId),
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

    // Get unread count (messages not sent by this user and not READ)
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

    // Get other members (for display name in DIRECT chats)
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

    results.push({
      conversation: conv,
      lastMessage: lastMessage ?? null,
      unreadCount,
      muted: mutedMap.get(convId) ?? false,
      otherMembers: members,
    });
  }

  // Sort by last message time (most recent first)
  results.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt?.getTime() ?? a.conversation.createdAt.getTime();
    const bTime = b.lastMessage?.createdAt?.getTime() ?? b.conversation.createdAt.getTime();
    return bTime - aTime;
  });

  return results;
}

export type ConversationWithDetails = Awaited<
  ReturnType<typeof getConversations>
>[number];
```

- [ ] **Step 2: Create get-messages query**

Create `src/domains/messaging/queries/get-messages.ts`:

```typescript
import { eq, desc, lt } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages, users } from "@/shared/db/schema";

const MESSAGES_PER_PAGE = 50;

export async function getMessages(
  conversationId: string,
  cursor?: string
) {
  const conditions = [eq(messages.conversationId, conversationId)];

  // For cursor-based pagination: load messages before the cursor
  if (cursor) {
    conditions.push(lt(messages.createdAt, new Date(cursor)));
  }

  const results = await db
    .select({
      id: messages.id,
      content: messages.content,
      images: messages.images,
      status: messages.status,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(
      conditions.length === 1
        ? conditions[0]
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (undefined as any) // handled below
    )
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGES_PER_PAGE + 1);

  // Proper multi-condition query
  const { and } = await import("drizzle-orm");
  const properResults = await db
    .select({
      id: messages.id,
      content: messages.content,
      images: messages.images,
      status: messages.status,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGES_PER_PAGE + 1);

  const hasMore = properResults.length > MESSAGES_PER_PAGE;
  const items = hasMore
    ? properResults.slice(0, MESSAGES_PER_PAGE)
    : properResults;

  return {
    messages: items.reverse(), // oldest first for chat display
    hasMore,
    nextCursor: hasMore
      ? items[0].createdAt.toISOString()
      : null,
  };
}

export type MessageWithSender = Awaited<
  ReturnType<typeof getMessages>
>["messages"][number];
```

Wait — that query has an issue. Let me fix the `get-messages.ts` to properly use `and()`:

Replace the full `get-messages.ts` with a cleaner version:

Create `src/domains/messaging/queries/get-messages.ts`:

```typescript
import { eq, desc, lt, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages, users } from "@/shared/db/schema";

const MESSAGES_PER_PAGE = 50;

export async function getMessages(
  conversationId: string,
  cursor?: string
) {
  const conditions = [eq(messages.conversationId, conversationId)];

  if (cursor) {
    conditions.push(lt(messages.createdAt, new Date(cursor)));
  }

  const results = await db
    .select({
      id: messages.id,
      content: messages.content,
      images: messages.images,
      status: messages.status,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(desc(messages.createdAt))
    .limit(MESSAGES_PER_PAGE + 1);

  const hasMore = results.length > MESSAGES_PER_PAGE;
  const items = hasMore
    ? results.slice(0, MESSAGES_PER_PAGE)
    : results;

  return {
    messages: items.reverse(),
    hasMore,
    nextCursor: hasMore ? items[0].createdAt.toISOString() : null,
  };
}

export type MessageWithSender = Awaited<
  ReturnType<typeof getMessages>
>["messages"][number];
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/messaging/queries/get-conversations.ts src/domains/messaging/queries/get-messages.ts
git commit -m "feat: add messaging queries — conversation list with unread counts, paginated messages"
```

---

## Task 7: Barrel Export

**Files:**
- Create: `src/domains/messaging/index.ts`

- [ ] **Step 1: Create barrel export**

Create `src/domains/messaging/index.ts`:

```typescript
export {
  sendMessageSchema,
  createConversationSchema,
  type SendMessageInput,
  type CreateConversationInput,
} from "./schemas/validation";
export { createConversation } from "./actions/create-conversation";
export { sendMessage } from "./actions/send-message";
export { markAsRead } from "./actions/mark-as-read";
export {
  getConversations,
  type ConversationWithDetails,
} from "./queries/get-conversations";
export {
  getMessages,
  type MessageWithSender,
} from "./queries/get-messages";
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/messaging/index.ts
git commit -m "feat: add messaging domain barrel export"
```

---

## Task 8: UI Components — Install shadcn + Message Bubble + Conversation Item

**Files:**
- Create: `src/shared/ui/dialog.tsx` (via shadcn)
- Create: `src/shared/ui/avatar.tsx` (via shadcn)
- Create: `src/shared/ui/scroll-area.tsx` (via shadcn)
- Create: `src/domains/messaging/components/message-bubble.tsx`
- Create: `src/domains/messaging/components/conversation-item.tsx`

- [ ] **Step 1: Install shadcn dialog, avatar, scroll-area components**

Run:
```bash
npx shadcn@latest add dialog avatar scroll-area -y
```

- [ ] **Step 2: Create message bubble component**

Create `src/domains/messaging/components/message-bubble.tsx`:

```typescript
"use client";

import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import type { MessageWithSender } from "../queries/get-messages";

interface MessageBubbleProps {
  message: MessageWithSender;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const initials = message.sender.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex gap-2 max-w-[80%]",
        isOwn ? "ml-auto flex-row-reverse" : ""
      )}
    >
      {!isOwn && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={message.sender.avatar ?? undefined} />
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
      )}
      <div>
        {!isOwn && (
          <p className="text-xs text-muted-foreground mb-1">
            {message.sender.name}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
        <p
          className={cn(
            "text-[10px] text-muted-foreground mt-1",
            isOwn ? "text-right" : ""
          )}
        >
          {new Date(message.createdAt).toLocaleTimeString("pl-PL", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create conversation item component**

Create `src/domains/messaging/components/conversation-item.tsx`:

```typescript
"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import type { ConversationWithDetails } from "../queries/get-conversations";

interface ConversationItemProps {
  item: ConversationWithDetails;
  currentUserId: string;
  isActive?: boolean;
}

export function ConversationItem({
  item,
  currentUserId,
  isActive,
}: ConversationItemProps) {
  const t = useTranslations("messaging");
  const { conversation, lastMessage, unreadCount, otherMembers } = item;

  const displayName =
    conversation.type === "DIRECT"
      ? otherMembers[0]?.name ?? t("directConversation")
      : conversation.name ?? t("groupConversation");

  const avatar =
    conversation.type === "DIRECT" ? otherMembers[0]?.avatar : null;

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const lastMessagePreview = lastMessage
    ? lastMessage.senderId === currentUserId
      ? `${t("you")}: ${lastMessage.content}`
      : lastMessage.content
    : null;

  function formatTime(date: Date) {
    const now = new Date();
    const msgDate = new Date(date);
    const diffMs = now.getTime() - msgDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return msgDate.toLocaleTimeString("pl-PL", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (diffDays === 1) return t("yesterday");
    return msgDate.toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <Link href={`/messages/${conversation.id}`}>
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors",
          isActive && "bg-muted",
          unreadCount > 0 && "font-medium"
        )}
      >
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={avatar ?? undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {lastMessage && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatTime(lastMessage.createdAt)}
              </span>
            )}
          </div>
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
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui/dialog.tsx src/shared/ui/avatar.tsx src/shared/ui/scroll-area.tsx src/domains/messaging/components/message-bubble.tsx src/domains/messaging/components/conversation-item.tsx
git commit -m "feat: add messaging UI components — message bubble, conversation item"
```

---

## Task 9: UI Components — Chat View + New Conversation Dialog

**Files:**
- Create: `src/domains/messaging/components/chat-view.tsx`
- Create: `src/domains/messaging/components/new-conversation-dialog.tsx`

- [ ] **Step 1: Create chat view component**

Create `src/domains/messaging/components/chat-view.tsx`:

```typescript
"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Send } from "lucide-react";
import { sendMessage } from "../actions/send-message";
import { markAsRead } from "../actions/mark-as-read";
import { MessageBubble } from "./message-bubble";
import type { MessageWithSender } from "../queries/get-messages";

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageWithSender[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function ChatView({
  conversationId,
  currentUserId,
  initialMessages,
  hasMore: initialHasMore,
  nextCursor: initialNextCursor,
}: ChatViewProps) {
  const t = useTranslations("messaging");
  const [messageList, setMessageList] =
    useState<MessageWithSender[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark messages as read on mount
  useEffect(() => {
    markAsRead(conversationId);
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList.length]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/messages/${conversationId}?after=${
            messageList.length > 0
              ? messageList[messageList.length - 1].createdAt.toISOString()
              : ""
          }`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length > 0) {
            setMessageList((prev) => [...prev, ...data.messages]);
            markAsRead(conversationId);
          }
        }
      } catch {
        // Polling failure is non-critical
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId, messageList]);

  function handleSend() {
    const content = input.trim();
    if (!content) return;

    setInput("");

    // Optimistic update
    const optimisticMessage: MessageWithSender = {
      id: `temp-${Date.now()}`,
      content,
      images: [],
      status: "SENT",
      createdAt: new Date(),
      sender: {
        id: currentUserId,
        name: "",
        avatar: null,
      },
    };
    setMessageList((prev) => [...prev, optimisticMessage]);

    startTransition(async () => {
      const result = await sendMessage({
        conversationId,
        content,
      });

      if (!result.success) {
        // Remove optimistic message on failure
        setMessageList((prev) =>
          prev.filter((m) => m.id !== optimisticMessage.id)
        );
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messageList.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noMessages")}
          </p>
        ) : (
          <div className="space-y-3">
            {messageList.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={msg.sender.id === currentUserId}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("typeMessage")}
            disabled={isPending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isPending || !input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create new conversation dialog component**

Create `src/domains/messaging/components/new-conversation-dialog.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Plus } from "lucide-react";
import { createConversation } from "../actions/create-conversation";

interface UserSearchResult {
  id: string;
  name: string;
  avatar: string | null;
}

interface NewConversationDialogProps {
  users: UserSearchResult[];
}

export function NewConversationDialog({
  users: allUsers,
}: NewConversationDialogProps) {
  const t = useTranslations("messaging");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = allUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleSelectUser(userId: string) {
    startTransition(async () => {
      const result = await createConversation({
        type: "DIRECT",
        participantIds: [userId],
      });

      if (result.success) {
        setOpen(false);
        router.push(`/messages/${result.conversationId}`);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("newConversation")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("startConversation")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder={t("searchUsers")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-60 overflow-y-auto space-y-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("searchUsers")}
              </p>
            ) : (
              filtered.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id)}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <span className="text-sm">{user.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/messaging/components/chat-view.tsx src/domains/messaging/components/new-conversation-dialog.tsx
git commit -m "feat: add chat view with polling and new conversation dialog"
```

---

## Task 10: UI Components — Conversation List

**Files:**
- Create: `src/domains/messaging/components/conversation-list.tsx`

- [ ] **Step 1: Create conversation list component**

Create `src/domains/messaging/components/conversation-list.tsx`:

```typescript
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ConversationItem } from "./conversation-item";
import { NewConversationDialog } from "./new-conversation-dialog";
import type { ConversationWithDetails } from "../queries/get-conversations";

interface ConversationListProps {
  initialConversations: ConversationWithDetails[];
  currentUserId: string;
  activeConversationId?: string;
  users: { id: string; name: string; avatar: string | null }[];
}

export function ConversationList({
  initialConversations,
  currentUserId,
  activeConversationId,
  users,
}: ConversationListProps) {
  const t = useTranslations("messaging");
  const [conversationsList, setConversationsList] = useState(
    initialConversations
  );

  // Poll for conversation updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/conversations");
        if (res.ok) {
          const data = await res.json();
          setConversationsList(data.conversations);
        }
      } catch {
        // Polling failure is non-critical
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-bold">{t("conversations")}</h2>
        <NewConversationDialog users={users} />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversationsList.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 px-4">
            {t("noConversations")}
          </p>
        ) : (
          <div className="p-2 space-y-1">
            {conversationsList.map((item) => (
              <ConversationItem
                key={item.conversation.id}
                item={item}
                currentUserId={currentUserId}
                isActive={
                  item.conversation.id === activeConversationId
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/messaging/components/conversation-list.tsx
git commit -m "feat: add conversation list component with polling"
```

---

## Task 11: API Routes for Polling

**Files:**
- Create: `src/app/api/messages/[conversationId]/route.ts`
- Create: `src/app/api/conversations/route.ts`

- [ ] **Step 1: Create messages polling API route**

Create `src/app/api/messages/[conversationId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { eq, and, gt, ne } from "drizzle-orm";
import { db } from "@/shared/db";
import { messages, users, conversationMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;
  const after = request.nextUrl.searchParams.get("after");

  // Verify membership
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const conditions = [eq(messages.conversationId, conversationId)];
  if (after) {
    conditions.push(gt(messages.createdAt, new Date(after)));
  }

  const newMessages = await db
    .select({
      id: messages.id,
      content: messages.content,
      images: messages.images,
      status: messages.status,
      createdAt: messages.createdAt,
      sender: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(and(...conditions))
    .orderBy(messages.createdAt);

  return NextResponse.json({ messages: newMessages });
}
```

- [ ] **Step 2: Create conversations polling API route**

Create `src/app/api/conversations/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/domains/auth/lib/auth";
import { getConversations } from "@/domains/messaging/queries/get-conversations";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await getConversations(session.user.id);

  return NextResponse.json({ conversations });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/[conversationId]/route.ts src/app/api/conversations/route.ts
git commit -m "feat: add polling API routes for messages and conversations"
```

---

## Task 12: Pages — Messages List + Conversation Detail

**Files:**
- Create: `src/app/[locale]/(main)/messages/page.tsx`
- Create: `src/app/[locale]/(main)/messages/[id]/page.tsx`

- [ ] **Step 1: Create messages list page**

Create `src/app/[locale]/(main)/messages/page.tsx`:

```typescript
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { redirect } from "next/navigation";
import { ne, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getConversations } from "@/domains/messaging/queries/get-conversations";
import { ConversationList } from "@/domains/messaging/components/conversation-list";

export default async function MessagesPage() {
  const t = await getTranslations("messaging");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const conversations = await getConversations(session.user.id);

  // Get all users for new conversation dialog (exclude self)
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
    })
    .from(users)
    .where(ne(users.id, session.user.id));

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-4rem)]">
      <ConversationList
        initialConversations={conversations}
        currentUserId={session.user.id}
        users={allUsers}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create conversation detail page**

Create `src/app/[locale]/(main)/messages/[id]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/shared/db";
import { conversations, conversationMembers, users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { getMessages } from "@/domains/messaging/queries/get-messages";
import { getConversations } from "@/domains/messaging/queries/get-conversations";
import { ChatView } from "@/domains/messaging/components/chat-view";
import { ConversationList } from "@/domains/messaging/components/conversation-list";
import { Button } from "@/shared/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("messaging");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;

  // Verify membership
  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, id),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    notFound();
  }

  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, id),
  });

  if (!conversation) {
    notFound();
  }

  // Get other members for header
  const otherMembers = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .where(
      and(
        eq(conversationMembers.conversationId, id),
        ne(conversationMembers.userId, session.user.id)
      )
    );

  const displayName =
    conversation.type === "DIRECT"
      ? otherMembers[0]?.name ?? t("directConversation")
      : conversation.name ?? t("groupConversation");

  const { messages, hasMore, nextCursor } = await getMessages(id);

  // For desktop split view: get all conversations + all users
  const allConversations = await getConversations(session.user.id);
  const allUsers = await db
    .select({ id: users.id, name: users.name, avatar: users.avatar })
    .from(users)
    .where(ne(users.id, session.user.id));

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-4rem)] flex">
      {/* Desktop sidebar */}
      <div className="hidden md:block w-80 border-r">
        <ConversationList
          initialConversations={allConversations}
          currentUserId={session.user.id}
          activeConversationId={id}
          users={allUsers}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="border-b p-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            asChild
          >
            <Link href="/messages">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <p className="font-medium">{displayName}</p>
            {conversation.type === "GROUP" && (
              <p className="text-xs text-muted-foreground">
                {otherMembers.length + 1} {t("membersCount")}
              </p>
            )}
          </div>
        </div>

        <ChatView
          conversationId={id}
          currentUserId={session.user.id}
          initialMessages={messages}
          hasMore={hasMore}
          nextCursor={nextCursor}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(main)/messages/page.tsx" "src/app/[locale]/(main)/messages/[id]/page.tsx"
git commit -m "feat: add messages pages — conversation list and chat detail with split view"
```

---

## Task 13: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (existing + new messaging tests).

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run linter**

Run: `npx eslint src/ --ext .ts,.tsx`
Expected: No errors (warnings acceptable).

- [ ] **Step 4: Fix any issues found in steps 1-3**

Fix TypeScript errors, lint issues, or failing tests as needed.

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: Build succeeds with `/[locale]/messages` and `/[locale]/messages/[id]` routes listed.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any issues from Phase 3 verification"
```
