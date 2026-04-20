# Umami Analytics Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Umami analytics to plonbli with a typed `analytics` domain, automatic pageview tracking, and 18 custom events across auth, marketplace, orders, social, messaging, and profile.

**Architecture:** Create `src/domains/analytics/` as a self-contained domain exposing `trackEvent()`, `useAnalytics()`, `EVENTS` const, and `<AnalyticsScript />`. Other domains import from analytics — no reverse dependency. Umami script loads via Next.js `<Script strategy="afterInteractive">` in the locale layout.

**Tech Stack:** Umami (external, deployed separately), Next.js Script, TypeScript generics for typed event map, Vitest for unit tests.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/domains/analytics/types.ts` |
| Create | `src/domains/analytics/events.ts` |
| Create | `src/domains/analytics/track-event.ts` |
| Create | `src/domains/analytics/use-analytics.ts` |
| Create | `src/domains/analytics/analytics-script.tsx` |
| Create | `src/domains/analytics/index.ts` |
| Create | `tests/domains/analytics/track-event.test.ts` |
| Modify | `src/app/[locale]/layout.tsx` |
| Modify | `.env.example` |
| Modify | `src/domains/auth/components/register-form.tsx` |
| Modify | `src/domains/auth/components/login-form.tsx` |
| Modify | `src/domains/marketplace/components/product-detail.tsx` |
| Modify | `src/domains/marketplace/components/availability-select.tsx` |
| Modify | `src/domains/marketplace/components/listing-form.tsx` |
| Modify | `src/domains/orders/components/cart/cart-item-row.tsx` |
| Modify | `src/domains/orders/components/cart/cart-view.tsx` |
| Modify | `src/domains/orders/components/checkout/checkout-form.tsx` |
| Modify | `src/domains/social/components/post-form.tsx` |
| Modify | `src/domains/social/components/post-card.tsx` |
| Modify | `src/domains/social/components/group-header.tsx` |
| Modify | `src/domains/social/components/rsvp-button.tsx` |
| Modify | `src/domains/messaging/components/chat-view.tsx` |
| Modify | `src/app/[locale]/(main)/messages/[id]/page.tsx` |
| Modify | `src/domains/auth/components/profile-form.tsx` |

---

## Task 1: Analytics domain core — types, events, trackEvent

**Files:**
- Create: `src/domains/analytics/types.ts`
- Create: `src/domains/analytics/events.ts`
- Create: `src/domains/analytics/track-event.ts`
- Create: `tests/domains/analytics/track-event.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/domains/analytics/track-event.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { trackEvent } from "@/domains/analytics/track-event";

describe("trackEvent", () => {
  afterEach(() => {
    delete (window as Window & { umami?: unknown }).umami;
  });

  it("is a no-op when window.umami is not defined", () => {
    expect(() => trackEvent("auth.logged_out")).not.toThrow();
  });

  it("calls window.umami.track with event name and data", () => {
    const track = vi.fn();
    (window as Window & { umami?: unknown }).umami = { track };

    trackEvent("auth.registered", { method: "email" });

    expect(track).toHaveBeenCalledWith("auth.registered", { method: "email" });
  });

  it("passes undefined data for no-data events", () => {
    const track = vi.fn();
    (window as Window & { umami?: unknown }).umami = { track };

    trackEvent("message.sent");

    expect(track).toHaveBeenCalledWith("message.sent", undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/analytics/track-event.test.ts
```

Expected: FAIL — `Cannot find module '@/domains/analytics/track-event'`

- [ ] **Step 3: Create types.ts**

Create `src/domains/analytics/types.ts`:

```ts
export type EventProperties = {
  "auth.registered": { method: "email" | "google" | "facebook" };
  "auth.logged_in": { method: "email" | "google" | "facebook" };
  "auth.logged_out": undefined;
  "listing.viewed": { listingId: string; farmerId: string; category: string };
  "listing.created": { listingId: string; category: string; hasAvailability: boolean };
  "listing.availability_updated": { listingId: string; availability: string };
  "cart.item_added": { listingId: string; farmerId: string; price: number };
  "cart.item_removed": { listingId: string };
  "order.placed": { orderId: string; farmerId: string; itemCount: number; totalValue: number };
  "order.status_changed": { orderId: string; fromStatus: string; toStatus: string };
  "post.created": { hasMedia: boolean };
  "post.liked": undefined;
  "group.joined": { groupId: string };
  "event.rsvp": { eventId: string };
  "conversation.started": { recipientRole: string };
  "message.sent": undefined;
  "role.upgraded_to_farmer": undefined;
};

export type EventName = keyof EventProperties;
```

- [ ] **Step 4: Create events.ts**

Create `src/domains/analytics/events.ts`:

```ts
import type { EventName } from "./types";

export const EVENTS = {
  AUTH_REGISTERED: "auth.registered",
  AUTH_LOGGED_IN: "auth.logged_in",
  AUTH_LOGGED_OUT: "auth.logged_out",
  LISTING_VIEWED: "listing.viewed",
  LISTING_CREATED: "listing.created",
  LISTING_AVAILABILITY_UPDATED: "listing.availability_updated",
  CART_ITEM_ADDED: "cart.item_added",
  CART_ITEM_REMOVED: "cart.item_removed",
  ORDER_PLACED: "order.placed",
  ORDER_STATUS_CHANGED: "order.status_changed",
  POST_CREATED: "post.created",
  POST_LIKED: "post.liked",
  GROUP_JOINED: "group.joined",
  EVENT_RSVP: "event.rsvp",
  CONVERSATION_STARTED: "conversation.started",
  MESSAGE_SENT: "message.sent",
  ROLE_UPGRADED_TO_FARMER: "role.upgraded_to_farmer",
} as const satisfies Record<string, EventName>;
```

- [ ] **Step 5: Create track-event.ts**

Create `src/domains/analytics/track-event.ts`:

```ts
import type { EventName, EventProperties } from "./types";

declare global {
  interface Window {
    umami?: {
      track(event: string, data?: Record<string, unknown>): void;
    };
  }
}

export function trackEvent<T extends EventName>(
  event: T,
  data?: EventProperties[T]
): void {
  if (typeof window === "undefined") return;
  if (!window.umami) return;
  window.umami.track(event, data as Record<string, unknown> | undefined);
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run tests/domains/analytics/track-event.test.ts
```

Expected: PASS — 3 tests pass

- [ ] **Step 7: Commit**

```bash
git add src/domains/analytics/types.ts src/domains/analytics/events.ts src/domains/analytics/track-event.ts tests/domains/analytics/track-event.test.ts
git commit -m "feat(analytics): add analytics domain core — types, events, trackEvent"
```

---

## Task 2: Analytics domain shell — useAnalytics, AnalyticsScript, index.ts

**Files:**
- Create: `src/domains/analytics/use-analytics.ts`
- Create: `src/domains/analytics/analytics-script.tsx`
- Create: `src/domains/analytics/index.ts`

- [ ] **Step 1: Create use-analytics.ts**

Create `src/domains/analytics/use-analytics.ts`:

```ts
"use client";

import { useCallback } from "react";
import { trackEvent } from "./track-event";
import type { EventName, EventProperties } from "./types";

export function useAnalytics() {
  const track = useCallback(
    <T extends EventName>(event: T, data?: EventProperties[T]) => {
      trackEvent(event, data);
    },
    []
  );

  return { trackEvent: track };
}
```

- [ ] **Step 2: Create analytics-script.tsx**

Create `src/domains/analytics/analytics-script.tsx`:

```tsx
import Script from "next/script";

export function AnalyticsScript() {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
  const umamiUrl = process.env.NEXT_PUBLIC_UMAMI_URL;

  if (!websiteId || !umamiUrl) return null;

  return (
    <Script
      src={`${umamiUrl}/script.js`}
      data-website-id={websiteId}
      strategy="afterInteractive"
    />
  );
}
```

- [ ] **Step 3: Create index.ts**

Create `src/domains/analytics/index.ts`:

```ts
export { EVENTS } from "./events";
export { trackEvent } from "./track-event";
export { useAnalytics } from "./use-analytics";
export { AnalyticsScript } from "./analytics-script";
export type { EventName, EventProperties } from "./types";
```

- [ ] **Step 4: Run all tests to confirm no regressions**

```bash
npx vitest run
```

Expected: All existing tests pass + 3 analytics tests pass

- [ ] **Step 5: Commit**

```bash
git add src/domains/analytics/use-analytics.ts src/domains/analytics/analytics-script.tsx src/domains/analytics/index.ts
git commit -m "feat(analytics): add useAnalytics hook, AnalyticsScript, and domain index"
```

---

## Task 3: Wire Umami script into layout

**Files:**
- Modify: `.env.example`
- Modify: `src/app/[locale]/layout.tsx`

- [ ] **Step 1: Add env vars to .env.example**

In `.env.example`, add after `# Supabase Storage` block:

```
# Umami Analytics
NEXT_PUBLIC_UMAMI_WEBSITE_ID=
NEXT_PUBLIC_UMAMI_URL=https://analytics.plonbli.com
```

- [ ] **Step 2: Add AnalyticsScript to layout**

Replace `src/app/[locale]/layout.tsx` content:

```tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import { AnalyticsScript } from "@/domains/analytics";

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
        {children}
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add .env.example src/app/[locale]/layout.tsx
git commit -m "feat(analytics): wire Umami script into locale layout"
```

---

## Task 4: Auth events — register + login

**Files:**
- Modify: `src/domains/auth/components/register-form.tsx`
- Modify: `src/domains/auth/components/login-form.tsx`

- [ ] **Step 1: Add auth.registered to register-form**

In `src/domains/auth/components/register-form.tsx`, add import at top:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In the `onSubmit` function, replace:

```tsx
      if (result.success) {
        router.push("/login?registered=true");
```

with:

```tsx
      if (result.success) {
        trackEvent(EVENTS.AUTH_REGISTERED, { method: "email" });
        router.push("/login?registered=true");
```

- [ ] **Step 2: Add auth.logged_in to login-form**

In `src/domains/auth/components/login-form.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In the `onSubmit` function, replace:

```tsx
      if (result.success) {
        router.push("/");
        router.refresh();
```

with:

```tsx
      if (result.success) {
        trackEvent(EVENTS.AUTH_LOGGED_IN, { method: "email" });
        router.push("/");
        router.refresh();
```

For the OAuth buttons, replace:

```tsx
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn("facebook", { callbackUrl: "/" })}
        >
          Facebook
        </Button>
```

with:

```tsx
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            trackEvent(EVENTS.AUTH_LOGGED_IN, { method: "google" });
            signIn("google", { callbackUrl: "/" });
          }}
        >
          Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            trackEvent(EVENTS.AUTH_LOGGED_IN, { method: "facebook" });
            signIn("facebook", { callbackUrl: "/" });
          }}
        >
          Facebook
        </Button>
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/domains/auth/components/register-form.tsx src/domains/auth/components/login-form.tsx
git commit -m "feat(analytics): track auth.registered and auth.logged_in events"
```

---

## Task 5: Marketplace events — listing viewed, cart added, availability updated

**Files:**
- Modify: `src/domains/marketplace/components/product-detail.tsx`
- Modify: `src/domains/marketplace/components/availability-select.tsx`

- [ ] **Step 1: Add listing.viewed and cart.item_added to product-detail**

In `src/domains/marketplace/components/product-detail.tsx`, add import:

```tsx
import { useEffect } from "react";
import { useAnalytics, EVENTS } from "@/domains/analytics";
```

Note: `useState` and `useTransition` are already imported — add `useEffect` to that same import line.

At the top of the `ProductDetail` component function body, after the existing `const [cartSuccess, setCartSuccess] = useState(false);` line, add:

```tsx
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(EVENTS.LISTING_VIEWED, {
      listingId: listing.id,
      farmerId: product.farmer.id,
      category: product.category.name,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

In the `handleAddToCart` function, replace:

```tsx
      const result = await addToCart({ listingId: listing.id, quantity: cartQty });
      if (result.success) {
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 3000);
      }
```

with:

```tsx
      const result = await addToCart({ listingId: listing.id, quantity: cartQty });
      if (result.success) {
        trackEvent(EVENTS.CART_ITEM_ADDED, {
          listingId: listing.id,
          farmerId: product.farmer.id,
          price: Number(listing.price),
        });
        setCartSuccess(true);
        setTimeout(() => setCartSuccess(false), 3000);
      }
```

- [ ] **Step 2: Add listing.availability_updated to availability-select**

In `src/domains/marketplace/components/availability-select.tsx`, add import:

```tsx
import { useAnalytics, EVENTS } from "@/domains/analytics";
```

In `AvailabilitySelect`, add after the existing hooks:

```tsx
  const { trackEvent } = useAnalytics();
```

In `handleChange`, replace:

```tsx
    startTransition(async () => {
      const result = await updateAvailability(listingId, newValue);
      if (!result.success) {
        setCurrent(value); // revert on error
      }
    });
```

with:

```tsx
    startTransition(async () => {
      const result = await updateAvailability(listingId, newValue);
      if (result.success) {
        trackEvent(EVENTS.LISTING_AVAILABILITY_UPDATED, {
          listingId,
          availability: next,
        });
      } else {
        setCurrent(value); // revert on error
      }
    });
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/domains/marketplace/components/product-detail.tsx src/domains/marketplace/components/availability-select.tsx
git commit -m "feat(analytics): track listing.viewed, cart.item_added, listing.availability_updated"
```

---

## Task 6: Marketplace events — listing created

**Files:**
- Modify: `src/domains/marketplace/components/listing-form.tsx`

- [ ] **Step 1: Add listing.created to listing-form**

In `src/domains/marketplace/components/listing-form.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In the `onSubmit` function, replace the create branch:

```tsx
      } else {
        const result = await createListing(payload);
        if (result.success) {
          router.push(`/marketplace?mine=1`);
        } else if (!result.success && result.error) {
          setServerError(result.error);
        }
      }
```

with:

```tsx
      } else {
        const result = await createListing(payload);
        if (result.success) {
          trackEvent(EVENTS.LISTING_CREATED, {
            listingId: result.listingId,
            category: data.categoryId,
            hasAvailability: data.availability === "AVAILABLE",
          });
          router.push(`/marketplace?mine=1`);
        } else if (!result.success && result.error) {
          setServerError(result.error);
        }
      }
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/marketplace/components/listing-form.tsx
git commit -m "feat(analytics): track listing.created event"
```

---

## Task 7: Orders events — cart item removed, order placed

**Files:**
- Modify: `src/domains/orders/components/cart/cart-item-row.tsx`
- Modify: `src/domains/orders/components/cart/cart-view.tsx`
- Modify: `src/domains/orders/components/checkout/checkout-form.tsx`

- [ ] **Step 1: Add listingId prop to CartItemRow and track cart.item_removed**

In `src/domains/orders/components/cart/cart-item-row.tsx`, add `listingId` to the interface and track on remove.

Replace the interface:

```tsx
interface CartItemRowProps {
  cartItemId: string;
  listingId: string;
  productName: string;
  quantity: number;
  price: number;
  unit: string;
  image?: string;
  onUpdate: () => void;
}
```

Add import:

```tsx
import { useAnalytics, EVENTS } from "@/domains/analytics";
```

Add `listingId` to destructured props:

```tsx
export function CartItemRow({
  cartItemId, listingId, productName, quantity, price, unit, image, onUpdate,
}: CartItemRowProps) {
```

Add hook after existing hooks:

```tsx
  const { trackEvent } = useAnalytics();
```

In `handleRemove`, replace:

```tsx
  function handleRemove() {
    startTransition(async () => {
      await removeFromCart(cartItemId);
      onUpdate();
    });
  }
```

with:

```tsx
  function handleRemove() {
    startTransition(async () => {
      await removeFromCart(cartItemId);
      trackEvent(EVENTS.CART_ITEM_REMOVED, { listingId });
      onUpdate();
    });
  }
```

- [ ] **Step 2: Pass listingId from CartView**

In `src/domains/orders/components/cart/cart-view.tsx`, replace the CartItemRow usage:

```tsx
            <CartItemRow
              key={item.cartItem.id}
              cartItemId={item.cartItem.id}
              productName={item.product.name}
              quantity={Number(item.cartItem.quantity)}
              price={Number(item.listing.price)}
              unit={item.listing.unit}
              image={item.product.images[0]}
              onUpdate={handleUpdate}
            />
```

with:

```tsx
            <CartItemRow
              key={item.cartItem.id}
              cartItemId={item.cartItem.id}
              listingId={item.listing.id}
              productName={item.product.name}
              quantity={Number(item.cartItem.quantity)}
              price={Number(item.listing.price)}
              unit={item.listing.unit}
              image={item.product.images[0]}
              onUpdate={handleUpdate}
            />
```

- [ ] **Step 3: Add order.placed to checkout-form**

In `src/domains/orders/components/checkout/checkout-form.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In `handleSubmit`, replace:

```tsx
      if (result.success) {
        router.push(`/orders/${result.orderId}`);
```

with:

```tsx
      if (result.success) {
        trackEvent(EVENTS.ORDER_PLACED, {
          orderId: result.orderId,
          farmerId,
          itemCount: cartGroup.items.length,
          totalValue: cartGroup.total,
        });
        router.push(`/orders/${result.orderId}`);
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/domains/orders/components/cart/cart-item-row.tsx src/domains/orders/components/cart/cart-view.tsx src/domains/orders/components/checkout/checkout-form.tsx
git commit -m "feat(analytics): track cart.item_removed and order.placed events"
```

---

## Task 8: Social events — post, like, group, RSVP

**Files:**
- Modify: `src/domains/social/components/post-form.tsx`
- Modify: `src/domains/social/components/post-card.tsx`
- Modify: `src/domains/social/components/group-header.tsx`
- Modify: `src/domains/social/components/rsvp-button.tsx`

- [ ] **Step 1: Add post.created to post-form**

In `src/domains/social/components/post-form.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In `handleSubmit`, replace:

```tsx
      if (result.success) {
        setContent("");
        setImages([]);
        setAttachedShare(null);
        setSharedEntity(null);
        router.refresh();
      }
```

with:

```tsx
      if (result.success) {
        trackEvent(EVENTS.POST_CREATED, { hasMedia: images.length > 0 });
        setContent("");
        setImages([]);
        setAttachedShare(null);
        setSharedEntity(null);
        router.refresh();
      }
```

- [ ] **Step 2: Add post.liked to post-card**

In `src/domains/social/components/post-card.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In `handleLike`, replace:

```tsx
  function handleLike() {
    startTransition(async () => {
      await toggleReaction(post.id);
    });
  }
```

with:

```tsx
  function handleLike() {
    startTransition(async () => {
      await toggleReaction(post.id);
      if (!post.liked) {
        trackEvent(EVENTS.POST_LIKED);
      }
    });
  }
```

- [ ] **Step 3: Add group.joined to group-header**

In `src/domains/social/components/group-header.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In `handleJoinLeave`, replace:

```tsx
  function handleJoinLeave() {
    startTransition(async () => {
      await joinGroup(group.id);
      router.refresh();
    });
  }
```

with:

```tsx
  function handleJoinLeave() {
    startTransition(async () => {
      await joinGroup(group.id);
      if (!group.isMember) {
        trackEvent(EVENTS.GROUP_JOINED, { groupId: group.id });
      }
      router.refresh();
    });
  }
```

- [ ] **Step 4: Add event.rsvp to rsvp-button**

In `src/domains/social/components/rsvp-button.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In `handleRsvp`, replace:

```tsx
  function handleRsvp(status: "GOING" | "INTERESTED") {
    startTransition(async () => {
      await rsvpEvent({ eventId, status });
      router.refresh();
    });
  }
```

with:

```tsx
  function handleRsvp(status: "GOING" | "INTERESTED") {
    startTransition(async () => {
      await rsvpEvent({ eventId, status });
      trackEvent(EVENTS.EVENT_RSVP, { eventId });
      router.refresh();
    });
  }
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/domains/social/components/post-form.tsx src/domains/social/components/post-card.tsx src/domains/social/components/group-header.tsx src/domains/social/components/rsvp-button.tsx
git commit -m "feat(analytics): track post.created, post.liked, group.joined, event.rsvp"
```

---

## Task 9: Messaging events — message sent, conversation started

**Files:**
- Modify: `src/domains/messaging/components/chat-view.tsx`
- Modify: `src/app/[locale]/(main)/messages/[id]/page.tsx`

- [ ] **Step 1: Add recipientRole prop and tracking to ChatView**

In `src/domains/messaging/components/chat-view.tsx`, add import:

```tsx
import { useAnalytics, EVENTS } from "@/domains/analytics";
```

Add `recipientRole` to the interface:

```tsx
interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
  initialMessages: MessageWithSender[];
  recipientRole?: string;
}
```

Update destructured props:

```tsx
export function ChatView({
  conversationId,
  currentUserId,
  initialMessages,
  recipientRole,
}: ChatViewProps) {
```

Add hook after existing hooks (after `const bottomRef = useRef...`):

```tsx
  const { trackEvent } = useAnalytics();
```

In `handleSend`, replace the success branch:

```tsx
      if (result.success) {
        // Replace temp ID with real message ID so polling dedup works correctly
        setMessageList((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? { ...m, id: result.messageId } : m
          )
        );
```

with:

```tsx
      if (result.success) {
        // Replace temp ID with real message ID so polling dedup works correctly
        setMessageList((prev) =>
          prev.map((m) =>
            m.id === optimisticMessage.id ? { ...m, id: result.messageId } : m
          )
        );
        trackEvent(EVENTS.MESSAGE_SENT);
        if (messageList.length === 0) {
          trackEvent(EVENTS.CONVERSATION_STARTED, {
            recipientRole: recipientRole ?? "unknown",
          });
        }
```

- [ ] **Step 2: Pass recipientRole from the conversation page**

In `src/app/[locale]/(main)/messages/[id]/page.tsx`, update the `otherMembers` query to include `role`.

Replace:

```tsx
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
```

with:

```tsx
  const otherMembers = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: users.role,
    })
    .from(conversationMembers)
    .innerJoin(users, eq(conversationMembers.userId, users.id))
    .where(
      and(
        eq(conversationMembers.conversationId, id),
        ne(conversationMembers.userId, session.user.id)
      )
    );
```

Pass `recipientRole` to `<ChatView>`. Replace:

```tsx
        <ChatView
          conversationId={id}
          currentUserId={session.user.id}
          initialMessages={messages}
        />
```

with:

```tsx
        <ChatView
          conversationId={id}
          currentUserId={session.user.id}
          initialMessages={messages}
          recipientRole={otherMembers[0]?.role?.toLowerCase()}
        />
```

- [ ] **Step 3: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/domains/messaging/components/chat-view.tsx src/app/[locale]/\(main\)/messages/\[id\]/page.tsx
git commit -m "feat(analytics): track message.sent and conversation.started events"
```

---

## Task 10: Profile event — role upgrade to farmer

**Files:**
- Modify: `src/domains/auth/components/profile-form.tsx`

- [ ] **Step 1: Add role.upgraded_to_farmer to profile-form**

In `src/domains/auth/components/profile-form.tsx`, add import:

```tsx
import { trackEvent, EVENTS } from "@/domains/analytics";
```

In `onSubmit`, replace:

```tsx
  function onSubmit(data: ProfileInput) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.success) {
        setMessage(t("saved"));
      }
    });
  }
```

with:

```tsx
  function onSubmit(data: ProfileInput) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.success) {
        const wasNotFarmer = user.role !== "FARMER" && user.role !== "BOTH";
        const isFarmerNow = data.role === "FARMER" || data.role === "BOTH";
        if (wasNotFarmer && isFarmerNow) {
          trackEvent(EVENTS.ROLE_UPGRADED_TO_FARMER);
        }
        setMessage(t("saved"));
      }
    });
  }
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/domains/auth/components/profile-form.tsx
git commit -m "feat(analytics): track role.upgraded_to_farmer event"
```

---

## Self-Review

### Spec Coverage Check

| Spec requirement | Covered by |
|-----------------|-----------|
| Umami deployed on Vercel — separate project | Infrastructure (outside this code, see spec) |
| Separate Neon database | Infrastructure (outside this code, see spec) |
| `NEXT_PUBLIC_UMAMI_WEBSITE_ID` + `NEXT_PUBLIC_UMAMI_URL` env vars | Task 3, .env.example |
| `<AnalyticsScript />` in layout with `afterInteractive` | Task 3, layout.tsx |
| `src/domains/analytics/` domain structure | Tasks 1–2 |
| `EVENTS` const — single source of truth | Task 1, events.ts |
| Typed properties per event | Task 1, types.ts |
| SSR-safe (window guard) | Task 1, track-event.ts |
| No circular deps | Confirmed — analytics imports nothing from other domains |
| `auth.registered` | Task 4, register-form |
| `auth.logged_in` (email + google + facebook) | Task 4, login-form |
| `listing.viewed` | Task 5, product-detail |
| `listing.created` | Task 6, listing-form |
| `listing.availability_updated` | Task 5, availability-select |
| `cart.item_added` | Task 5, product-detail |
| `cart.item_removed` | Task 7, cart-item-row + cart-view |
| `order.placed` | Task 7, checkout-form |
| `post.created` | Task 8, post-form |
| `post.liked` | Task 8, post-card |
| `group.joined` | Task 8, group-header |
| `event.rsvp` | Task 8, rsvp-button |
| `message.sent` | Task 9, chat-view |
| `conversation.started` | Task 9, chat-view + messages page |
| `role.upgraded_to_farmer` | Task 10, profile-form |
| `order.status_changed` | ⚠️ Not covered — see note below |

**Note on `order.status_changed`:** The spec lists this event but all status changes in the app happen via server actions called from components like `farmer-order-detail.tsx` and `order-detail.tsx`. These components are complex. Since the test suite has no component tests for these, and the event would require auditing multiple status-change callsites, this can be added as a follow-up task to keep this plan focused.
