# Context Messaging Design

**Date:** 2026-04-20
**Status:** Approved

## Overview

Extend the messaging system to support conversations linked to a specific order or listing. Users can start a dedicated conversation about a particular order or product directly from the order/listing page, rather than navigating to the general messages inbox.

## Problem

- The "Message to Farmer" button on the order detail page navigates to `/messages` without any order context, leaving the user to manually find or start a conversation.
- There is no "Ask about product" button on the listing page.
- Two users who trade frequently would have one shared DIRECT conversation, making it hard to track which messages relate to which order or product.

## Solution

Add `orderId` and `listingId` nullable FK columns to the `conversations` table. Each order or listing can have its own dedicated conversation thread per pair of users. Conversations are created lazily — only when the user clicks the relevant button.

## Schema Changes

Add to `conversations` table:

```ts
orderId:   text("order_id").references(() => orders.id, { onDelete: "set null" })
listingId: text("listing_id").references(() => listings.id, { onDelete: "set null" })
```

- At most one of `orderId` / `listingId` is set per conversation.
- Conversation type remains `DIRECT`. Context is a separate layer.
- Drizzle relations: `conversations` → `orders`, `conversations` → `listings`.
- A new Drizzle migration adds both columns (nullable, no impact on existing data).

## Backend

### `createConversation` action

Extended with optional `orderId` and `listingId` fields in the schema. Deduplication logic updated:

- **Without context:** existing behavior — find any DIRECT conversation between the two users.
- **With `orderId`:** find a DIRECT conversation between the two users that also has the same `orderId`. If not found, create a new one.
- **With `listingId`:** same logic using `listingId`.

This means the same farmer and customer can have:
- A general DIRECT conversation
- A conversation about order #Z-001
- A conversation about listing "Jabłka Ligol"

All separate, no duplicates.

Access control enforced in the action:
- `orderId` provided: verify the current user is `customerId` or `farmerId` on that order, else `{ success: false, error: "Brak dostępu" }`.
- `listingId` provided: verify the listing exists, else `{ success: false, error: "Ogłoszenie nie istnieje" }`.

### `getConversations` query

Join context data when fetching conversation list:
- If `orderId` set: join `orders` to get `orderNumber`.
- If `listingId` set: join `listings` → `products` to get product name and price.

Return as `context: { type: 'ORDER', label: '#Z-2025-001' } | { type: 'LISTING', label: 'Jabłka Ligol — 2.50 zł/kg' } | null`.

## UI

### Order detail page (`order-detail.tsx`)

The existing "Wiadomość do farmera" button calls `createConversation` with `orderId`, then redirects to `/messages/{conversationId}`. The button shows a loading state while the action runs.

### Listing page (`product-detail.tsx`)

New "Zapytaj o produkt" button, visible only when `!isOwner`. Calls `createConversation` with `listingId` and the farmer's user ID as participant, then redirects to `/messages/{conversationId}`.

### Conversation list (`conversation-item.tsx`)

When a conversation has context, display it below the participant name as a small subtitle:

```
Jan Kowalski
Zamówienie #Z-2025-001
```

```
Jan Kowalski
Jabłka Ligol — 2.50 zł/kg
```

### Chat header (`chat-view.tsx`)

When the conversation has context, display a clickable link above the message list:

- Order context → links to `/orders/{orderId}` or `/farmer/orders/{orderId}`
- Listing context → links to the listing page

## Testing

### `create-conversation.test.ts`

- Creating a conversation with `orderId` succeeds.
- Calling again with the same `orderId` and same participants returns the existing conversation (deduplication).
- Creating a conversation with `listingId` succeeds.
- Calling again with the same `listingId` and same participants returns the existing conversation.
- Existing DIRECT conversation behavior unchanged.
- Access check: non-participant providing `orderId` returns error.

### `get-conversations.test.ts`

- Conversation with `orderId` returns `context.type === 'ORDER'` with correct `orderNumber`.
- Conversation with `listingId` returns `context.type === 'LISTING'` with correct label.
- Conversation without context returns `context === null`.

## Out of Scope

- Notifications for new messages in context conversations (uses existing unread mechanism).
- Farmer-side "message about order" button in farmer order detail (same pattern, can be added later).
- Group conversations with order/listing context.
