# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Firebase Cloud Messaging push notifications to the Plonbli PWA for messages, social activity, and marketplace events.

**Architecture:** New `src/domains/notifications/` domain owns all push logic. Two new DB tables (`push_subscriptions`, `notification_preferences`). FCM service worker served via Next.js API route at `/firebase-messaging-sw.js`. Triggers added fire-and-forget to existing Server Actions.

**Tech Stack:** `firebase` (client SDK), `firebase-admin` (server SDK), `sonner` (foreground toasts), Drizzle ORM, Next.js App Router, next-intl.

---

## File Structure

**New files:**
- `src/shared/db/schema/push-subscriptions.ts` — push_subscriptions table
- `src/shared/db/schema/notification-preferences.ts` — notification_preferences table
- `src/shared/lib/firebase-admin.ts` — Firebase Admin SDK singleton
- `src/shared/lib/firebase-client.ts` — Firebase Client SDK helpers
- `src/domains/notifications/schemas/validation.ts` — Zod schemas
- `src/domains/notifications/lib/notification-types.ts` — payload type + builders
- `src/domains/notifications/lib/send-notification.ts` — FCM send helper
- `src/domains/notifications/actions/save-push-token.ts`
- `src/domains/notifications/actions/delete-push-token.ts`
- `src/domains/notifications/actions/update-notification-preferences.ts`
- `src/domains/notifications/queries/get-user-tokens.ts`
- `src/domains/notifications/queries/get-notification-preferences.ts`
- `src/domains/notifications/components/push-permission-prompt.tsx`
- `src/domains/notifications/components/foreground-message-handler.tsx`
- `src/domains/notifications/components/notification-settings.tsx`
- `src/domains/notifications/index.ts`
- `src/app/firebase-messaging-sw.js/route.ts` — dynamic SW with env vars
- `tests/domains/notifications/lib/send-notification.test.ts`
- `tests/domains/notifications/actions/save-push-token.test.ts`
- `tests/domains/notifications/actions/delete-push-token.test.ts`
- `tests/domains/notifications/actions/update-notification-preferences.test.ts`
- `tests/domains/notifications/queries/get-notification-preferences.test.ts`

**Modified files:**
- `src/shared/db/schema/relations.ts` — add pushSubscriptions + notificationPreferences relations
- `src/shared/db/schema/index.ts` — export new tables
- `.env.example` — add Firebase vars
- `src/app/[locale]/(main)/layout.tsx` — add PushPermissionPrompt + ForegroundMessageHandler
- `src/app/[locale]/(main)/profile/settings/page.tsx` — add NotificationSettings card
- `messages/pl.json` — add `notifications` namespace
- `src/domains/messaging/actions/send-message.ts` — trigger push
- `src/domains/social/actions/toggle-follow.ts` — trigger push
- `src/domains/social/actions/add-comment.ts` — trigger push
- `src/domains/social/actions/toggle-reaction.ts` — trigger push
- `src/domains/marketplace/actions/create-listing.ts` — trigger push (batch)
- `src/domains/orders/actions/create-order.ts` — trigger push
- `src/domains/orders/actions/update-order-status.ts` — trigger push
- `tests/domains/messaging/actions/send-message.test.ts` — mock sendNotification
- `tests/domains/social/actions/toggle-follow.test.ts` — mock sendNotification (new file)
- `tests/domains/social/actions/add-comment.test.ts` — mock sendNotification (new file)
- `tests/domains/social/actions/toggle-reaction.test.ts` — mock sendNotification (new file)
- `tests/domains/marketplace/actions/create-listing.test.ts` — mock sendNotification (new file)
- `tests/domains/orders/actions/create-order.test.ts` — mock sendNotification (new file)
- `tests/domains/orders/actions/update-order-status.test.ts` — mock sendNotification (new file)

---

## Task 1: Install dependencies

- [ ] **Step 1: Install Firebase and Sonner**

```bash
npm install firebase firebase-admin sonner
```

Expected output: 3 packages added.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install firebase, firebase-admin, sonner"
```

---

## Task 2: DB Schema — push_subscriptions + notification_preferences

**Files:**
- Create: `src/shared/db/schema/push-subscriptions.ts`
- Create: `src/shared/db/schema/notification-preferences.ts`
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create push_subscriptions schema**

`src/shared/db/schema/push-subscriptions.ts`:
```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fcmToken: text("fcm_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert;
```

- [ ] **Step 2: Create notification_preferences schema**

`src/shared/db/schema/notification-preferences.ts`:
```typescript
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationPreferences = pgTable("notification_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  messages: boolean("messages").notNull().default(true),
  social: boolean("social").notNull().default(true),
  marketplace: boolean("marketplace").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
```

- [ ] **Step 3: Add relations to relations.ts**

Add the following imports at the top of `src/shared/db/schema/relations.ts` (after existing imports):
```typescript
import { pushSubscriptions } from "./push-subscriptions";
import { notificationPreferences } from "./notification-preferences";
```

Add these exports at the end of `src/shared/db/schema/relations.ts`:
```typescript
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 4: Export from schema/index.ts**

Add at the end of `src/shared/db/schema/index.ts`:
```typescript
// Push Notifications
export {
  pushSubscriptions,
  type PushSubscription,
  type NewPushSubscription,
} from "./push-subscriptions";

export {
  notificationPreferences,
  type NotificationPreferences,
} from "./notification-preferences";

export {
  pushSubscriptionsRelations,
  notificationPreferencesRelations,
} from "./relations";
```

- [ ] **Step 5: Apply schema to database**

```bash
npm run db:push
```

Expected: Drizzle applies 2 new tables (`push_subscriptions`, `notification_preferences`). Type `yes` when prompted.

- [ ] **Step 6: Commit**

```bash
git add src/shared/db/schema/push-subscriptions.ts src/shared/db/schema/notification-preferences.ts src/shared/db/schema/relations.ts src/shared/db/schema/index.ts
git commit -m "feat(notifications): add push_subscriptions and notification_preferences schema"
```

---

## Task 3: .env.example + Firebase Admin SDK singleton

**Files:**
- Modify: `.env.example`
- Create: `src/shared/lib/firebase-admin.ts`

- [ ] **Step 1: Update .env.example**

Add at the end of `.env.example`:
```
# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=
```

- [ ] **Step 2: Create Firebase Admin singleton**

`src/shared/lib/firebase-admin.ts`:
```typescript
import admin from "firebase-admin";
import type { App } from "firebase-admin/app";

let firebaseAdminApp: App | undefined;

export function getFirebaseAdmin(): App {
  if (firebaseAdminApp) return firebaseAdminApp;

  if (admin.apps.length > 0) {
    firebaseAdminApp = admin.apps[0]!;
    return firebaseAdminApp;
  }

  firebaseAdminApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });

  return firebaseAdminApp;
}
```

- [ ] **Step 3: Commit**

```bash
git add .env.example src/shared/lib/firebase-admin.ts
git commit -m "feat(notifications): add Firebase Admin SDK singleton and env vars"
```

---

## Task 4: Notification types + send-notification (TDD)

**Files:**
- Create: `src/domains/notifications/lib/notification-types.ts`
- Create: `src/domains/notifications/lib/send-notification.ts`
- Create: `tests/domains/notifications/lib/send-notification.test.ts`

- [ ] **Step 1: Create notification-types.ts**

`src/domains/notifications/lib/notification-types.ts`:
```typescript
export type NotificationCategory = "messages" | "social" | "marketplace";

export interface NotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  url: string;
}

export function buildMessageNotification(
  senderName: string,
  content: string,
  conversationId: string
): NotificationPayload {
  return {
    category: "messages",
    title: senderName,
    body: content.length > 100 ? content.substring(0, 97) + "..." : content,
    url: `/messages/${conversationId}`,
  };
}

export function buildFollowNotification(
  followerName: string,
  followerId: string
): NotificationPayload {
  return {
    category: "social",
    title: "Nowy obserwujący",
    body: `${followerName} zaczął(a) Cię obserwować`,
    url: `/profile/${followerId}`,
  };
}

export function buildCommentNotification(
  commenterName: string,
  postId: string
): NotificationPayload {
  return {
    category: "social",
    title: "Nowy komentarz",
    body: `${commenterName} skomentował(a) Twój post`,
    url: `/posts/${postId}`,
  };
}

export function buildReactionNotification(
  reactorName: string,
  postId: string
): NotificationPayload {
  return {
    category: "social",
    title: "Nowa reakcja",
    body: `${reactorName} polubił(a) Twój post`,
    url: `/posts/${postId}`,
  };
}

export function buildNewListingNotification(
  farmerName: string,
  productName: string,
  listingId: string
): NotificationPayload {
  return {
    category: "marketplace",
    title: `Nowa oferta: ${productName}`,
    body: `${farmerName} dodał(a) nową ofertę`,
    url: `/listings/${listingId}`,
  };
}

export function buildNewOrderNotification(
  customerName: string,
  orderNumber: string,
  orderId: string
): NotificationPayload {
  return {
    category: "marketplace",
    title: "Nowe zamówienie",
    body: `${customerName} złożył(a) zamówienie ${orderNumber}`,
    url: `/farmer/orders/${orderId}`,
  };
}

export function buildOrderStatusNotification(
  status: string,
  orderNumber: string,
  orderId: string
): NotificationPayload {
  const labels: Record<string, string> = {
    CONFIRMED: "potwierdzone",
    PREPARING: "w przygotowaniu",
    SHIPPED: "wysłane",
    READY_FOR_PICKUP: "gotowe do odbioru",
    DELIVERED: "dostarczone",
    CANCELLED: "anulowane",
  };
  return {
    category: "marketplace",
    title: "Aktualizacja zamówienia",
    body: `Zamówienie ${orderNumber} jest ${labels[status] ?? status}`,
    url: `/orders/${orderId}`,
  };
}
```

- [ ] **Step 2: Write the failing test**

`tests/domains/notifications/lib/send-notification.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/lib/firebase-admin", () => ({
  getFirebaseAdmin: vi.fn(),
}));

vi.mock("@/domains/notifications/queries/get-user-tokens", () => ({
  getUserTokens: vi.fn(),
}));

vi.mock("@/domains/notifications/queries/get-notification-preferences", () => ({
  getNotificationPreferences: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    delete: vi.fn().mockReturnValue({ where: vi.fn() }),
  },
}));

describe("sendNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when user has no tokens", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce([]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    const { getFirebaseAdmin } = await import("@/shared/lib/firebase-admin");
    const mockSend = vi.fn();
    vi.mocked(getFirebaseAdmin).mockReturnValue({
      messaging: () => ({ sendEachForMulticast: mockSend }),
    } as any);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    await sendNotification("user-1", {
      category: "messages",
      title: "Test",
      body: "Body",
      url: "/messages/1",
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does nothing when category is disabled in preferences", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["token-1"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: false,
      social: true,
      marketplace: true,
    });

    const { getFirebaseAdmin } = await import("@/shared/lib/firebase-admin");
    const mockSend = vi.fn();
    vi.mocked(getFirebaseAdmin).mockReturnValue({
      messaging: () => ({ sendEachForMulticast: mockSend }),
    } as any);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    await sendNotification("user-1", {
      category: "messages",
      title: "Test",
      body: "Body",
      url: "/messages/1",
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("sends to all tokens with correct payload", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["token-1", "token-2"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    const { getFirebaseAdmin } = await import("@/shared/lib/firebase-admin");
    const mockSend = vi
      .fn()
      .mockResolvedValueOnce({ responses: [{ success: true }, { success: true }] });
    vi.mocked(getFirebaseAdmin).mockReturnValue({
      messaging: () => ({ sendEachForMulticast: mockSend }),
    } as any);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    await sendNotification("user-1", {
      category: "messages",
      title: "Jan Kowalski",
      body: "Cześć!",
      url: "/messages/conv-1",
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        tokens: ["token-1", "token-2"],
        notification: { title: "Jan Kowalski", body: "Cześć!" },
        data: { url: "/messages/conv-1" },
      })
    );
  });

  it("removes invalid tokens from DB on error response", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["valid", "bad-token"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    const { getFirebaseAdmin } = await import("@/shared/lib/firebase-admin");
    const mockSend = vi.fn().mockResolvedValueOnce({
      responses: [
        { success: true },
        {
          success: false,
          error: { code: "messaging/registration-token-not-registered" },
        },
      ],
    });
    vi.mocked(getFirebaseAdmin).mockReturnValue({
      messaging: () => ({ sendEachForMulticast: mockSend }),
    } as any);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    const { db } = await import("@/shared/db");

    await sendNotification("user-1", {
      category: "messages",
      title: "Test",
      body: "Body",
      url: "/messages/1",
    });

    expect(vi.mocked(db.delete)).toHaveBeenCalled();
  });

  it("does not throw on FCM error", async () => {
    const { getUserTokens } = await import(
      "@/domains/notifications/queries/get-user-tokens"
    );
    vi.mocked(getUserTokens).mockResolvedValueOnce(["token-1"]);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    vi.mocked(getNotificationPreferences).mockResolvedValueOnce({
      messages: true,
      social: true,
      marketplace: true,
    });

    const { getFirebaseAdmin } = await import("@/shared/lib/firebase-admin");
    vi.mocked(getFirebaseAdmin).mockReturnValue({
      messaging: () => ({
        sendEachForMulticast: vi.fn().mockRejectedValueOnce(new Error("FCM down")),
      }),
    } as any);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );

    await expect(
      sendNotification("user-1", {
        category: "messages",
        title: "Test",
        body: "Body",
        url: "/messages/1",
      })
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/domains/notifications/lib/send-notification.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create send-notification.ts**

`src/domains/notifications/lib/send-notification.ts`:
```typescript
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { pushSubscriptions } from "@/shared/db/schema";
import { getFirebaseAdmin } from "@/shared/lib/firebase-admin";
import { getUserTokens } from "../queries/get-user-tokens";
import { getNotificationPreferences } from "../queries/get-notification-preferences";
import type { NotificationPayload } from "./notification-types";

const INVALID_TOKEN_CODES = [
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
];

export async function sendNotification(
  recipientUserId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    const [tokens, prefs] = await Promise.all([
      getUserTokens(recipientUserId),
      getNotificationPreferences(recipientUserId),
    ]);

    if (tokens.length === 0) return;
    if (!prefs[payload.category]) return;

    const admin = getFirebaseAdmin();
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: payload.title, body: payload.body },
      data: { url: payload.url },
      webpush: {
        notification: { icon: "/icons/icon-192.png" },
        fcmOptions: { link: payload.url },
      },
    });

    for (let i = 0; i < response.responses.length; i++) {
      const resp = response.responses[i];
      if (
        !resp.success &&
        resp.error &&
        INVALID_TOKEN_CODES.includes(resp.error.code)
      ) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.fcmToken, tokens[i]));
      }
    }
  } catch (error) {
    console.error("[sendNotification] error:", error);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/domains/notifications/lib/send-notification.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domains/notifications/lib/ tests/domains/notifications/lib/
git commit -m "feat(notifications): add notification-types and send-notification lib"
```

---

## Task 5: Notification actions — save-push-token + delete-push-token (TDD)

**Files:**
- Create: `src/domains/notifications/schemas/validation.ts`
- Create: `src/domains/notifications/actions/save-push-token.ts`
- Create: `src/domains/notifications/actions/delete-push-token.ts`
- Create: `tests/domains/notifications/actions/save-push-token.test.ts`
- Create: `tests/domains/notifications/actions/delete-push-token.test.ts`

- [ ] **Step 1: Create validation schema**

`src/domains/notifications/schemas/validation.ts`:
```typescript
import { z } from "zod";

export const savePushTokenSchema = z.object({
  fcmToken: z.string().min(1),
});

export const updatePreferencesSchema = z.object({
  messages: z.boolean(),
  social: z.boolean(),
  marketplace: z.boolean(),
});

export type SavePushTokenInput = z.infer<typeof savePushTokenSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
```

- [ ] **Step 2: Write failing tests**

`tests/domains/notifications/actions/save-push-token.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("savePushToken", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { savePushToken } = await import(
      "@/domains/notifications/actions/save-push-token"
    );
    const result = await savePushToken({ fcmToken: "token-abc" });
    expect(result.success).toBe(false);
  });

  it("returns error for empty token", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { savePushToken } = await import(
      "@/domains/notifications/actions/save-push-token"
    );
    const result = await savePushToken({ fcmToken: "" });
    expect(result.success).toBe(false);
  });

  it("saves token and creates preferences row on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const { savePushToken } = await import(
      "@/domains/notifications/actions/save-push-token"
    );
    const result = await savePushToken({ fcmToken: "token-abc" });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.insert)).toHaveBeenCalledTimes(2);
  });
});
```

`tests/domains/notifications/actions/delete-push-token.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

describe("deletePushToken", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { deletePushToken } = await import(
      "@/domains/notifications/actions/delete-push-token"
    );
    const result = await deletePushToken({ fcmToken: "token-abc" });
    expect(result.success).toBe(false);
  });

  it("deletes token on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

    const { deletePushToken } = await import(
      "@/domains/notifications/actions/delete-push-token"
    );
    const result = await deletePushToken({ fcmToken: "token-abc" });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.delete)).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/domains/notifications/actions/save-push-token.test.ts tests/domains/notifications/actions/delete-push-token.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Create save-push-token.ts**

`src/domains/notifications/actions/save-push-token.ts`:
```typescript
"use server";

import { db } from "@/shared/db";
import { pushSubscriptions, notificationPreferences } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  savePushTokenSchema,
  type SavePushTokenInput,
} from "../schemas/validation";

type SavePushTokenResult = { success: true } | { success: false; error: string };

export async function savePushToken(
  input: SavePushTokenInput
): Promise<SavePushTokenResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = savePushTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidłowy token" };
  }

  await db
    .insert(pushSubscriptions)
    .values({ userId: session.user.id, fcmToken: parsed.data.fcmToken })
    .onConflictDoNothing();

  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id })
    .onConflictDoNothing();

  return { success: true };
}
```

- [ ] **Step 5: Create delete-push-token.ts**

`src/domains/notifications/actions/delete-push-token.ts`:
```typescript
"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { pushSubscriptions } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  savePushTokenSchema,
  type SavePushTokenInput,
} from "../schemas/validation";

type DeletePushTokenResult = { success: true } | { success: false; error: string };

export async function deletePushToken(
  input: SavePushTokenInput
): Promise<DeletePushTokenResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = savePushTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidłowy token" };
  }

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, session.user.id),
        eq(pushSubscriptions.fcmToken, parsed.data.fcmToken)
      )
    );

  return { success: true };
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/domains/notifications/actions/save-push-token.test.ts tests/domains/notifications/actions/delete-push-token.test.ts
```

Expected: PASS — 5 tests total.

- [ ] **Step 7: Commit**

```bash
git add src/domains/notifications/schemas/ src/domains/notifications/actions/save-push-token.ts src/domains/notifications/actions/delete-push-token.ts tests/domains/notifications/actions/
git commit -m "feat(notifications): add save/delete push token actions"
```

---

## Task 6: update-notification-preferences action (TDD)

**Files:**
- Create: `src/domains/notifications/actions/update-notification-preferences.ts`
- Create: `tests/domains/notifications/actions/update-notification-preferences.test.ts`

- [ ] **Step 1: Write failing test**

`tests/domains/notifications/actions/update-notification-preferences.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  },
}));

describe("updateNotificationPreferences", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { updateNotificationPreferences } = await import(
      "@/domains/notifications/actions/update-notification-preferences"
    );
    const result = await updateNotificationPreferences({
      messages: true,
      social: false,
      marketplace: true,
    });
    expect(result.success).toBe(false);
  });

  it("upserts preferences on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const { db } = await import("@/shared/db");
    const mockOnConflict = vi.fn().mockResolvedValue(undefined);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

    const { updateNotificationPreferences } = await import(
      "@/domains/notifications/actions/update-notification-preferences"
    );
    const result = await updateNotificationPreferences({
      messages: true,
      social: false,
      marketplace: true,
    });

    expect(result.success).toBe(true);
    expect(vi.mocked(db.insert)).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/notifications/actions/update-notification-preferences.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create update-notification-preferences.ts**

`src/domains/notifications/actions/update-notification-preferences.ts`:
```typescript
"use server";

import { db } from "@/shared/db";
import { notificationPreferences } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  updatePreferencesSchema,
  type UpdatePreferencesInput,
} from "../schemas/validation";

type UpdatePrefsResult = { success: true } | { success: false; error: string };

export async function updateNotificationPreferences(
  input: UpdatePreferencesInput
): Promise<UpdatePrefsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = updatePreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidłowe dane" };
  }

  await db
    .insert(notificationPreferences)
    .values({ userId: session.user.id, ...parsed.data })
    .onConflictDoUpdate({
      target: notificationPreferences.userId,
      set: parsed.data,
    });

  return { success: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/domains/notifications/actions/update-notification-preferences.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/domains/notifications/actions/update-notification-preferences.ts tests/domains/notifications/actions/update-notification-preferences.test.ts
git commit -m "feat(notifications): add update-notification-preferences action"
```

---

## Task 7: Notification queries (TDD)

**Files:**
- Create: `src/domains/notifications/queries/get-user-tokens.ts`
- Create: `src/domains/notifications/queries/get-notification-preferences.ts`
- Create: `tests/domains/notifications/queries/get-notification-preferences.test.ts`

- [ ] **Step 1: Create get-user-tokens.ts** (no test — trivial select)

`src/domains/notifications/queries/get-user-tokens.ts`:
```typescript
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { pushSubscriptions } from "@/shared/db/schema";

export async function getUserTokens(userId: string): Promise<string[]> {
  const rows = await db
    .select({ fcmToken: pushSubscriptions.fcmToken })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return rows.map((r) => r.fcmToken);
}
```

- [ ] **Step 2: Write failing test for get-notification-preferences**

`tests/domains/notifications/queries/get-notification-preferences.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => ({
  db: {
    query: {
      notificationPreferences: { findFirst: vi.fn() },
    },
  },
}));

describe("getNotificationPreferences", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns all-true defaults when no row exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.notificationPreferences.findFirst).mockResolvedValueOnce(
      undefined
    );

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    const prefs = await getNotificationPreferences("user-1");

    expect(prefs).toEqual({ messages: true, social: true, marketplace: true });
  });

  it("returns stored preferences when row exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.notificationPreferences.findFirst).mockResolvedValueOnce({
      userId: "user-1",
      messages: true,
      social: false,
      marketplace: true,
      updatedAt: new Date(),
    } as any);

    const { getNotificationPreferences } = await import(
      "@/domains/notifications/queries/get-notification-preferences"
    );
    const prefs = await getNotificationPreferences("user-1");

    expect(prefs.social).toBe(false);
    expect(prefs.messages).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run tests/domains/notifications/queries/get-notification-preferences.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create get-notification-preferences.ts**

`src/domains/notifications/queries/get-notification-preferences.ts`:
```typescript
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { notificationPreferences } from "@/shared/db/schema";

interface Preferences {
  messages: boolean;
  social: boolean;
  marketplace: boolean;
}

const DEFAULTS: Preferences = { messages: true, social: true, marketplace: true };

export async function getNotificationPreferences(
  userId: string
): Promise<Preferences> {
  const row = await db.query.notificationPreferences.findFirst({
    where: eq(notificationPreferences.userId, userId),
  });

  if (!row) return DEFAULTS;

  return { messages: row.messages, social: row.social, marketplace: row.marketplace };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run tests/domains/notifications/queries/get-notification-preferences.test.ts
```

Expected: PASS — 2 tests.

- [ ] **Step 6: Commit**

```bash
git add src/domains/notifications/queries/ tests/domains/notifications/queries/
git commit -m "feat(notifications): add notification queries"
```

---

## Task 8: Firebase Messaging Service Worker API route

**Files:**
- Create: `src/app/firebase-messaging-sw.js/route.ts`

This route serves the Firebase SW script at `/firebase-messaging-sw.js` with env vars injected at runtime — avoiding hard-coded config in a static file.

- [ ] **Step 1: Create the route**

`src/app/firebase-messaging-sw.js/route.ts`:
```typescript
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  const config = JSON.stringify({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

  const sw = `
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp(${config});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Plonbli';
  const body = payload.notification?.body || '';
  const url = payload.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    data: { url },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
`;

  return new NextResponse(sw, {
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/firebase-messaging-sw.js/"
git commit -m "feat(notifications): add Firebase Messaging service worker API route"
```

---

## Task 9: Firebase client + Sonner + ForegroundMessageHandler

**Files:**
- Create: `src/shared/lib/firebase-client.ts`
- Create: `src/domains/notifications/components/foreground-message-handler.tsx`
- Modify: `src/app/[locale]/layout.tsx` (add Toaster)

- [ ] **Step 1: Create Firebase client helpers**

`src/shared/lib/firebase-client.ts`:
```typescript
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getMessaging, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let messagingInstance: Messaging;

export function getFirebaseClient(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseMessaging(): Messaging {
  if (!messagingInstance) {
    messagingInstance = getMessaging(getFirebaseClient());
  }
  return messagingInstance;
}
```

- [ ] **Step 2: Create ForegroundMessageHandler**

`src/domains/notifications/components/foreground-message-handler.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { toast } from "sonner";
import { getFirebaseMessaging } from "@/shared/lib/firebase-client";

export function ForegroundMessageHandler() {
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    let unsubscribe: (() => void) | undefined;
    try {
      const messaging = getFirebaseMessaging();
      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? "Powiadomienie";
        const body = payload.notification?.body;
        const url = payload.data?.url;

        toast(title, {
          description: body,
          action: url
            ? { label: "Zobacz", onClick: () => { window.location.href = url; } }
            : undefined,
        });
      });
    } catch {
      // Firebase not configured — skip silently
    }

    return () => unsubscribe?.();
  }, []);

  return null;
}
```

- [ ] **Step 3: Add Sonner Toaster to locale layout**

In `src/app/[locale]/layout.tsx`, add `import { Toaster } from "sonner";` and render `<Toaster />` inside the ThemeProvider:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { AnalyticsScript } from "@/domains/analytics";
import { Toaster } from "sonner";

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AnalyticsScript />
        <Toaster richColors />
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 4: Run all tests to verify no regressions**

```bash
npm test
```

Expected: All existing tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/firebase-client.ts src/domains/notifications/components/foreground-message-handler.tsx src/app/[locale]/layout.tsx
git commit -m "feat(notifications): add Firebase client, Sonner toaster, foreground message handler"
```

---

## Task 10: PushPermissionPrompt + main layout integration

**Files:**
- Create: `src/domains/notifications/components/push-permission-prompt.tsx`
- Modify: `src/app/[locale]/(main)/layout.tsx`

- [ ] **Step 1: Create PushPermissionPrompt**

`src/domains/notifications/components/push-permission-prompt.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { getToken } from "firebase/messaging";
import { Bell, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { getFirebaseMessaging } from "@/shared/lib/firebase-client";
import { savePushToken } from "../actions/save-push-token";

const DISMISSED_KEY = "push-dismissed";

export function PushPermissionPrompt() {
  const t = useTranslations("notifications");
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "default" ||
      localStorage.getItem(DISMISSED_KEY) === "true"
    ) {
      return;
    }
    setShow(true);
  }, []);

  async function handleEnable() {
    setShow(false);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    try {
      const messaging = getFirebaseMessaging();
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      if (token) {
        await savePushToken({ fcmToken: token });
      }
    } catch (e) {
      console.error("[PushPermissionPrompt] getToken failed:", e);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 mx-4 mb-2 md:bottom-4 md:left-auto md:right-4 md:w-96">
      <div className="bg-card border rounded-lg shadow-lg p-4 flex items-start gap-3">
        <Bell className="h-5 w-5 mt-0.5 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">{t("promptTitle")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("promptBody")}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleEnable}>
              {t("enable")}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              {t("dismiss")}
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Zamknij"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to main layout**

Replace contents of `src/app/[locale]/(main)/layout.tsx`:
```tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { NavBar } from "@/shared/ui/nav-bar";
import { hasUnreadMessages } from "@/domains/messaging/queries/has-unread-messages";
import { hasUnseenOrderChanges } from "@/domains/orders/queries/has-unseen-order-changes";
import { PushPermissionPrompt } from "@/domains/notifications/components/push-permission-prompt";
import { ForegroundMessageHandler } from "@/domains/notifications/components/foreground-message-handler";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const [hasUnread, hasUnseenOrders] = await Promise.all([
    hasUnreadMessages(session.user!.id!),
    hasUnseenOrderChanges(session.user!.id!),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <NavBar hasUnread={hasUnread} hasUnseenOrders={hasUnseenOrders} />
      <main className="pb-20 md:pb-0">{children}</main>
      <PushPermissionPrompt />
      <ForegroundMessageHandler />
    </div>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/domains/notifications/components/push-permission-prompt.tsx src/app/[locale]/\(main\)/layout.tsx
git commit -m "feat(notifications): add push permission prompt to main layout"
```

---

## Task 11: NotificationSettings + translations + settings page + barrel export

**Files:**
- Create: `src/domains/notifications/components/notification-settings.tsx`
- Create: `src/domains/notifications/index.ts`
- Modify: `messages/pl.json`
- Modify: `src/app/[locale]/(main)/profile/settings/page.tsx`

- [ ] **Step 1: Add translations to messages/pl.json**

Add the `notifications` key to `messages/pl.json` (after the last existing key, before the closing `}`):

```json
  "notifications": {
    "promptTitle": "Włącz powiadomienia",
    "promptBody": "Otrzymuj powiadomienia o wiadomościach, nowych ofertach i aktualizacjach zamówień.",
    "enable": "Włącz",
    "dismiss": "Nie teraz",
    "settingsTitle": "Powiadomienia push",
    "settingsDescription": "Wybierz, o czym chcesz być powiadamiany.",
    "enablePushButton": "Włącz powiadomienia push",
    "messagesLabel": "Wiadomości",
    "socialLabel": "Aktywność społeczna",
    "marketplaceLabel": "Oferty i zamówienia",
    "notSupported": "Twoja przeglądarka nie obsługuje powiadomień push."
  }
```

- [ ] **Step 2: Create NotificationSettings component**

`src/domains/notifications/components/notification-settings.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { getToken } from "firebase/messaging";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { getFirebaseMessaging } from "@/shared/lib/firebase-client";
import { savePushToken } from "../actions/save-push-token";
import { updateNotificationPreferences } from "../actions/update-notification-preferences";
import type { NotificationPreferences } from "@/shared/db/schema";

interface Props {
  preferences: Pick<NotificationPreferences, "messages" | "social" | "marketplace"> | null;
}

export function NotificationSettings({ preferences }: Props) {
  const t = useTranslations("notifications");
  const [pushGranted, setPushGranted] = useState(false);
  const [prefs, setPrefs] = useState({
    messages: preferences?.messages ?? true,
    social: preferences?.social ?? true,
    marketplace: preferences?.marketplace ?? true,
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPushGranted(Notification.permission === "granted");
    }
  }, []);

  if (typeof window !== "undefined" && !("Notification" in window)) {
    return <p className="text-sm text-muted-foreground">{t("notSupported")}</p>;
  }

  async function handleEnablePush() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    try {
      const messaging = getFirebaseMessaging();
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      if (token) {
        await savePushToken({ fcmToken: token });
        setPushGranted(true);
      }
    } catch (e) {
      console.error("[NotificationSettings] getToken failed:", e);
    }
  }

  async function handleToggle(
    key: "messages" | "social" | "marketplace",
    value: boolean
  ) {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await updateNotificationPreferences(updated);
  }

  if (!pushGranted) {
    return (
      <Button variant="outline" onClick={handleEnablePush}>
        <Bell className="h-4 w-4 mr-2" />
        {t("enablePushButton")}
      </Button>
    );
  }

  const toggles: { key: "messages" | "social" | "marketplace"; label: string }[] = [
    { key: "messages", label: t("messagesLabel") },
    { key: "social", label: t("socialLabel") },
    { key: "marketplace", label: t("marketplaceLabel") },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("settingsDescription")}</p>
      {toggles.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between">
          <Label htmlFor={`notif-${key}`}>{label}</Label>
          <input
            id={`notif-${key}`}
            type="checkbox"
            checked={prefs[key]}
            onChange={(e) => handleToggle(key, e.target.checked)}
            className="h-4 w-4"
          />
        </div>
      ))}
    </div>
  );
}
```

Note: The project doesn't have a `Switch` component in `src/shared/ui/` — using a plain checkbox here. If shadcn Switch is later added, swap the `<input type="checkbox">` for `<Switch>`.

- [ ] **Step 3: Create notifications/index.ts**

`src/domains/notifications/index.ts`:
```typescript
export { savePushToken } from "./actions/save-push-token";
export { deletePushToken } from "./actions/delete-push-token";
export { updateNotificationPreferences } from "./actions/update-notification-preferences";
export { sendNotification } from "./lib/send-notification";
export {
  buildMessageNotification,
  buildFollowNotification,
  buildCommentNotification,
  buildReactionNotification,
  buildNewListingNotification,
  buildNewOrderNotification,
  buildOrderStatusNotification,
} from "./lib/notification-types";
export type { NotificationPayload, NotificationCategory } from "./lib/notification-types";
export { PushPermissionPrompt } from "./components/push-permission-prompt";
export { ForegroundMessageHandler } from "./components/foreground-message-handler";
export { NotificationSettings } from "./components/notification-settings";
```

- [ ] **Step 4: Update settings page**

In `src/app/[locale]/(main)/profile/settings/page.tsx`, add the NotificationSettings card. Replace the file contents:

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users, notificationPreferences } from "@/shared/db/schema";
import { ProfileForm } from "@/domains/auth/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { NotificationSettings } from "@/domains/notifications/components/notification-settings";

export default async function SettingsPage() {
  const t = await getTranslations("profile");
  const tNotif = await getTranslations("notifications");
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, prefs] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, session.user.id) }),
    db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, session.user.id),
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/profile">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("title")}
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tNotif("settingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettings preferences={prefs ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add messages/pl.json src/domains/notifications/components/notification-settings.tsx src/domains/notifications/index.ts "src/app/[locale]/(main)/profile/settings/page.tsx"
git commit -m "feat(notifications): add NotificationSettings component and profile settings integration"
```

---

## Task 12: Trigger push from send-message (TDD)

**Files:**
- Modify: `src/domains/messaging/actions/send-message.ts`
- Modify: `tests/domains/messaging/actions/send-message.test.ts`

- [ ] **Step 1: Update the existing test to mock sendNotification and add assertion**

In `tests/domains/messaging/actions/send-message.test.ts`, add a mock for `sendNotification` after the existing mocks and add a new test:

```typescript
// Add after existing vi.mock calls:
vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));
```

Add this new test inside `describe("sendMessage", ...)`:

```typescript
  it("triggers push notification to other conversation members after sending", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Jan Kowalski", email: "jan@example.com" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.conversationMembers.findFirst).mockResolvedValueOnce({
      conversationId: "conv-1",
      userId: "user-1",
      role: "MEMBER",
      muted: false,
      joinedAt: new Date(),
    });

    // Mock select for other members
    const mockWhere = vi.fn().mockResolvedValueOnce([
      { userId: "user-2" },
    ]);
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValueOnce({ from: mockFrom } as any);

    // Mock insert message
    const mockReturning = vi
      .fn()
      .mockResolvedValueOnce([{ id: "msg-1", createdAt: new Date() }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    // Mock update conversation
    vi.mocked(db.update).mockReturnValueOnce({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValueOnce(undefined) }),
    } as any);

    const result = await sendMessage({ conversationId: "conv-1", content: "Cześć!" });

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "messages", url: "/messages/conv-1" })
    );
  });
```

Also add `db.select` to the mock db object at the top:
```typescript
// In the vi.mock("@/shared/db") factory, add:
select: vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([]),
  }),
}),
```

- [ ] **Step 2: Run test to verify the new test fails**

```bash
npx vitest run tests/domains/messaging/actions/send-message.test.ts
```

Expected: existing 4 pass, new test FAILS.

- [ ] **Step 3: Update send-message.ts**

Replace contents of `src/domains/messaging/actions/send-message.ts`:
```typescript
"use server";

import { eq, and, ne } from "drizzle-orm";
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
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildMessageNotification } from "@/domains/notifications/lib/notification-types";

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

  const membership = await db.query.conversationMembers.findFirst({
    where: and(
      eq(conversationMembers.conversationId, conversationId),
      eq(conversationMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return { success: false, error: "Nie jestes czlonkiem tej rozmowy" };
  }

  const [message] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId: session.user.id,
      content,
      images,
    })
    .returning({ id: messages.id, createdAt: messages.createdAt });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Notify other members (fire-and-forget)
  const otherMembers = await db
    .select({ userId: conversationMembers.userId })
    .from(conversationMembers)
    .where(
      and(
        eq(conversationMembers.conversationId, conversationId),
        ne(conversationMembers.userId, session.user.id)
      )
    );

  for (const { userId } of otherMembers) {
    void sendNotification(
      userId,
      buildMessageNotification(session.user.name ?? "Ktoś", content, conversationId)
    );
  }

  return { success: true, messageId: message.id };
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domains/messaging/actions/send-message.ts tests/domains/messaging/actions/send-message.test.ts
git commit -m "feat(notifications): trigger push on new message"
```

---

## Task 13: Trigger push from toggle-follow (TDD)

**Files:**
- Modify: `src/domains/social/actions/toggle-follow.ts`
- Create: `tests/domains/social/actions/toggle-follow.test.ts`

- [ ] **Step 1: Write failing test**

`tests/domains/social/actions/toggle-follow.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    query: {
      follows: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("toggleFollow", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-2");
    expect(result.success).toBe(false);
  });

  it("returns error when trying to follow self", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-1");
    expect(result.success).toBe(false);
  });

  it("sends push notification when following", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Anna Nowak" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.follows.findFirst).mockResolvedValueOnce(undefined); // not following yet

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-2");

    expect(result.success).toBe(true);
    if (result.success) expect(result.following).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "social" })
    );
  });

  it("does not send push when unfollowing", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Anna Nowak" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.follows.findFirst).mockResolvedValueOnce({
      followerId: "user-1",
      followeeId: "user-2",
      createdAt: new Date(),
    } as any);

    const { toggleFollow } = await import(
      "@/domains/social/actions/toggle-follow"
    );
    const result = await toggleFollow("user-2");

    expect(result.success).toBe(true);
    if (result.success) expect(result.following).toBe(false);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/social/actions/toggle-follow.test.ts
```

Expected: FAIL — sendNotification not called.

- [ ] **Step 3: Update toggle-follow.ts**

Replace contents of `src/domains/social/actions/toggle-follow.ts`:
```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { follows } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildFollowNotification } from "@/domains/notifications/lib/notification-types";

type ToggleFollowResult =
  | { success: true; following: boolean }
  | { success: false; error: string };

export async function toggleFollow(
  targetUserId: string
): Promise<ToggleFollowResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  if (session.user.id === targetUserId) {
    return { success: false, error: "Nie mozesz obserwowac samego siebie" };
  }

  const existing = await db.query.follows.findFirst({
    where: and(
      eq(follows.followerId, session.user.id),
      eq(follows.followeeId, targetUserId)
    ),
  });

  if (existing) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, session.user.id),
          eq(follows.followeeId, targetUserId)
        )
      );
    return { success: true, following: false };
  }

  await db.insert(follows).values({
    followerId: session.user.id,
    followeeId: targetUserId,
  });

  void sendNotification(
    targetUserId,
    buildFollowNotification(session.user.name ?? "Ktoś", session.user.id)
  );

  return { success: true, following: true };
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domains/social/actions/toggle-follow.ts tests/domains/social/actions/toggle-follow.test.ts
git commit -m "feat(notifications): trigger push on new follow"
```

---

## Task 14: Trigger push from add-comment + toggle-reaction (TDD)

**Files:**
- Modify: `src/domains/social/actions/add-comment.ts`
- Modify: `src/domains/social/actions/toggle-reaction.ts`
- Create: `tests/domains/social/actions/add-comment.test.ts`
- Create: `tests/domains/social/actions/toggle-reaction.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/domains/social/actions/add-comment.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "comment-1" }]),
      }),
    }),
    query: {
      posts: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("addComment", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { addComment } = await import(
      "@/domains/social/actions/add-comment"
    );
    const result = await addComment({ postId: "post-1", content: "Świetny post!" });
    expect(result.success).toBe(false);
  });

  it("sends push to post author after commenting", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Piotr Wiśniewski" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.posts.findFirst).mockResolvedValueOnce({
      id: "post-1",
      authorId: "user-2",
    } as any);

    const { addComment } = await import(
      "@/domains/social/actions/add-comment"
    );
    const result = await addComment({ postId: "post-1", content: "Świetny post!" });

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "social", url: "/posts/post-1" })
    );
  });

  it("does not send push when commenting on own post", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Piotr" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.posts.findFirst).mockResolvedValueOnce({
      id: "post-1",
      authorId: "user-1", // same as commenter
    } as any);

    const { addComment } = await import(
      "@/domains/social/actions/add-comment"
    );
    await addComment({ postId: "post-1", content: "Mój własny post" });

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });
});
```

`tests/domains/social/actions/toggle-reaction.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    query: {
      reactions: { findFirst: vi.fn() },
      posts: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("toggleReaction", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("sends push to post author when reacting", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Maria" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.reactions.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.query.posts.findFirst).mockResolvedValueOnce({
      id: "post-1",
      authorId: "user-2",
    } as any);

    const { toggleReaction } = await import(
      "@/domains/social/actions/toggle-reaction"
    );
    await toggleReaction("post-1");

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "social" })
    );
  });

  it("does not send push when unreacting", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Maria" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.reactions.findFirst).mockResolvedValueOnce({
      postId: "post-1",
      userId: "user-1",
    } as any);

    const { toggleReaction } = await import(
      "@/domains/social/actions/toggle-reaction"
    );
    await toggleReaction("post-1");

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/social/actions/add-comment.test.ts tests/domains/social/actions/toggle-reaction.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Update add-comment.ts**

Replace contents of `src/domains/social/actions/add-comment.ts`:
```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { comments, posts } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  addCommentSchema,
  type AddCommentInput,
} from "../schemas/validation";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildCommentNotification } from "@/domains/notifications/lib/notification-types";

type AddCommentResult =
  | { success: true; commentId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function addComment(
  input: AddCommentInput
): Promise<AddCommentResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { postId, content } = parsed.data;

  const [comment] = await db
    .insert(comments)
    .values({
      postId,
      authorId: session.user.id,
      content,
    })
    .returning({ id: comments.id });

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (post && post.authorId !== session.user.id) {
    void sendNotification(
      post.authorId,
      buildCommentNotification(session.user.name ?? "Ktoś", postId)
    );
  }

  return { success: true, commentId: comment.id };
}
```

- [ ] **Step 4: Update toggle-reaction.ts**

Replace contents of `src/domains/social/actions/toggle-reaction.ts`:
```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { reactions, posts } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildReactionNotification } from "@/domains/notifications/lib/notification-types";

type ToggleReactionResult =
  | { success: true; liked: boolean }
  | { success: false; error: string };

export async function toggleReaction(
  postId: string
): Promise<ToggleReactionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.postId, postId),
      eq(reactions.userId, session.user.id)
    ),
  });

  if (existing) {
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, session.user.id)
        )
      );
    return { success: true, liked: false };
  }

  await db.insert(reactions).values({
    postId,
    userId: session.user.id,
  });

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (post && post.authorId !== session.user.id) {
    void sendNotification(
      post.authorId,
      buildReactionNotification(session.user.name ?? "Ktoś", postId)
    );
  }

  return { success: true, liked: true };
}
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/domains/social/actions/add-comment.ts src/domains/social/actions/toggle-reaction.ts tests/domains/social/actions/add-comment.test.ts tests/domains/social/actions/toggle-reaction.test.ts
git commit -m "feat(notifications): trigger push on comment and reaction"
```

---

## Task 15: Trigger push from create-listing (batch to followers) (TDD)

**Files:**
- Modify: `src/domains/marketplace/actions/create-listing.ts`
- Create: `tests/domains/marketplace/actions/create-listing.test.ts`

- [ ] **Step 1: Write failing test**

`tests/domains/marketplace/actions/create-listing.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  return {
    db: {
      insert: vi.fn().mockReturnValue({ values: mockValues }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      query: {
        users: { findFirst: vi.fn() },
      },
    },
  };
});

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

const validInput = {
  name: "Ziemniaki",
  description: "Świeże",
  categoryId: "cat-1",
  method: "ORGANIC" as const,
  tags: [],
  images: [],
  price: 5,
  unit: "KG" as const,
  quantityAvailable: 100,
  availability: "AVAILABLE" as const,
  deliveryOptions: [],
};

describe("createListing", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const { createListing } = await import(
      "@/domains/marketplace/actions/create-listing"
    );
    const result = await createListing(validInput);
    expect(result.success).toBe(false);
  });

  it("sends push to all followers after creating listing", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "farmer-1", name: "Rolnik Jan" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "farmer-1",
      role: "FARMER",
    } as any);

    // Insert product returns id
    const mockProductReturning = vi.fn().mockResolvedValueOnce([{ id: "product-1" }]);
    const mockProductValues = vi.fn().mockReturnValue({ returning: mockProductReturning });
    // Insert listing returns id
    const mockListingReturning = vi.fn().mockResolvedValueOnce([{ id: "listing-1" }]);
    const mockListingValues = vi.fn().mockReturnValue({ returning: mockListingReturning });

    vi.mocked(db.insert)
      .mockReturnValueOnce({ values: mockProductValues } as any)
      .mockReturnValueOnce({ values: mockListingValues } as any);

    // Followers: user-2 and user-3
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { followerId: "user-2" },
          { followerId: "user-3" },
        ]),
      }),
    } as any);

    const { createListing } = await import(
      "@/domains/marketplace/actions/create-listing"
    );
    const result = await createListing(validInput);

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-2",
      expect.objectContaining({ category: "marketplace", url: "/listings/listing-1" })
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "user-3",
      expect.objectContaining({ category: "marketplace" })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/marketplace/actions/create-listing.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Update create-listing.ts**

Replace contents of `src/domains/marketplace/actions/create-listing.ts`:
```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { products, listings, users, follows } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createListingSchema,
  type CreateListingInput,
} from "../schemas/validation";
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildNewListingNotification } from "@/domains/notifications/lib/notification-types";

type CreateListingResult =
  | { success: true; listingId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createListing(
  input: CreateListingInput
): Promise<CreateListingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || (user.role !== "FARMER" && user.role !== "BOTH")) {
    return {
      success: false,
      error: "Tylko rolnicy moga dodawac oferty",
    };
  }

  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const {
    name,
    description,
    categoryId,
    method,
    tags,
    images,
    price,
    unit,
    quantityAvailable,
    availability,
    validUntil,
    deliveryOptions,
  } = parsed.data;

  const [product] = await db
    .insert(products)
    .values({
      farmerId: session.user.id,
      name,
      description,
      categoryId,
      method,
      tags,
      images,
    })
    .returning({ id: products.id });

  const [listing] = await db
    .insert(listings)
    .values({
      productId: product.id,
      price: String(price),
      unit,
      quantityAvailable: quantityAvailable ? String(quantityAvailable) : null,
      availability,
      validUntil: validUntil ? new Date(validUntil) : null,
      deliveryOptions,
    })
    .returning({ id: listings.id });

  // Notify followers (fire-and-forget)
  const followers = await db
    .select({ followerId: follows.followerId })
    .from(follows)
    .where(eq(follows.followeeId, session.user.id));

  for (const { followerId } of followers) {
    void sendNotification(
      followerId,
      buildNewListingNotification(session.user.name ?? "Rolnik", name, listing.id)
    );
  }

  return { success: true, listingId: listing.id };
}
```

- [ ] **Step 4: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/domains/marketplace/actions/create-listing.ts tests/domains/marketplace/actions/create-listing.test.ts
git commit -m "feat(notifications): trigger push to followers on new listing"
```

---

## Task 16: Trigger push from create-order + update-order-status (TDD)

**Files:**
- Modify: `src/domains/orders/actions/create-order.ts`
- Modify: `src/domains/orders/actions/update-order-status.ts`
- Create: `tests/domains/orders/actions/create-order.test.ts`
- Create: `tests/domains/orders/actions/update-order-status.test.ts`

- [ ] **Step 1: Write failing tests**

`tests/domains/orders/actions/create-order.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
    transaction: vi.fn(),
  },
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("createOrder", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when cart is empty", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Klient" },
    } as any);

    const { createOrder } = await import(
      "@/domains/orders/actions/create-order"
    );
    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Koszyk jest pusty");
  });

  it("sends push to farmer after creating order", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", name: "Klient Jan" },
    } as any);

    const { db } = await import("@/shared/db");

    // Cart items with farmer products
    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                cartItem: { id: "ci-1", quantity: "2" },
                listing: { id: "listing-1", price: "10", unit: "KG", deliveryOptions: [] },
                product: { farmerId: "farmer-1", name: "Ziemniaki" },
              },
            ]),
          }),
        }),
      }),
    } as any);

    vi.mocked(db.transaction).mockImplementationOnce(async (cb) =>
      cb({
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "order-1" }]),
          }),
        }),
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any)
    );

    const { createOrder } = await import(
      "@/domains/orders/actions/create-order"
    );
    const result = await createOrder({
      farmerId: "farmer-1",
      deliveryMethod: "PICKUP",
    });

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "farmer-1",
      expect.objectContaining({ category: "marketplace", url: expect.stringContaining("/farmer/orders/") })
    );
  });
});
```

`tests/domains/orders/actions/update-order-status.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => ({
  db: {
    transaction: vi.fn(),
    query: {
      orders: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/domains/notifications/lib/send-notification", () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}));

describe("updateOrderStatus", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("returns error when order not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "farmer-1" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce(undefined);

    const { updateOrderStatus } = await import(
      "@/domains/orders/actions/update-order-status"
    );
    const result = await updateOrderStatus({ orderId: "order-1", status: "CONFIRMED" });
    expect(result.success).toBe(false);
  });

  it("sends push to customer on status update", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "farmer-1" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.orders.findFirst).mockResolvedValueOnce({
      id: "order-1",
      orderNumber: "PLB-2026-00001",
      farmerId: "farmer-1",
      customerId: "customer-1",
      status: "PAID",
    } as any);

    vi.mocked(db.transaction).mockImplementationOnce(async (cb) =>
      cb({
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      } as any)
    );

    const { updateOrderStatus } = await import(
      "@/domains/orders/actions/update-order-status"
    );
    // PAID → PREPARING is a valid transition per validTransitions map
    const result = await updateOrderStatus({ orderId: "order-1", status: "PREPARING" });

    expect(result.success).toBe(true);

    const { sendNotification } = await import(
      "@/domains/notifications/lib/send-notification"
    );
    expect(vi.mocked(sendNotification)).toHaveBeenCalledWith(
      "customer-1",
      expect.objectContaining({ category: "marketplace", url: "/orders/order-1" })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/orders/actions/create-order.test.ts tests/domains/orders/actions/update-order-status.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Update create-order.ts**

Add after the `return { success: true, orderId: result.id, orderNumber };` — just before it — a fire-and-forget push to farmer. Add these imports at the top of `src/domains/orders/actions/create-order.ts`:

```typescript
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildNewOrderNotification } from "@/domains/notifications/lib/notification-types";
```

Replace the final `return` line with:
```typescript
  void sendNotification(
    farmerId,
    buildNewOrderNotification(session.user.name ?? "Klient", orderNumber, result.id)
  );

  return { success: true, orderId: result.id, orderNumber };
```

`orderNumber` is the local variable defined before the transaction call. `result` is from `const result = await db.transaction(...)` — it only has `result.id`. Keep the rest of the file unchanged.

- [ ] **Step 4: Update update-order-status.ts**

Add these imports at the top of `src/domains/orders/actions/update-order-status.ts`:

```typescript
import { sendNotification } from "@/domains/notifications/lib/send-notification";
import { buildOrderStatusNotification } from "@/domains/notifications/lib/notification-types";
```

In `updateOrderStatus`, after `await db.transaction(...)`, add:
```typescript
  void sendNotification(
    order.customerId,
    buildOrderStatusNotification(status, order.orderNumber, orderId)
  );
```

In `markAsShipped`, after `await db.transaction(...)`, add:
```typescript
  void sendNotification(
    order.customerId,
    buildOrderStatusNotification("SHIPPED", order.orderNumber, orderId)
  );
```

- [ ] **Step 5: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/domains/orders/actions/create-order.ts src/domains/orders/actions/update-order-status.ts tests/domains/orders/actions/
git commit -m "feat(notifications): trigger push on order create and status update"
```

---

## Done

All 16 tasks complete. The push notification system is fully implemented:

- FCM infrastructure (Admin + Client SDK)
- DB tables for subscriptions and preferences
- Service worker served at `/firebase-messaging-sw.js`
- Permission prompt in main layout
- Foreground toast handler
- Notification preferences in profile settings
- Push triggers on: messages, follow, comment, reaction, new listing, new order, order status update

**To configure:**
1. Create a Firebase project at console.firebase.google.com
2. Enable Cloud Messaging
3. Copy Web App config → `NEXT_PUBLIC_FIREBASE_*` env vars
4. Generate a service account key → `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
5. Get Web Push certificate key from Project Settings → Cloud Messaging → `NEXT_PUBLIC_FIREBASE_VAPID_KEY`
