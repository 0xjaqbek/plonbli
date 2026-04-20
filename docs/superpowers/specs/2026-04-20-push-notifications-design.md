# Push Notifications Design

**Date:** 2026-04-20
**Status:** Approved

## Overview

Add Web Push notifications to the Plonbli PWA using Firebase Cloud Messaging (FCM). Users receive push notifications for new messages, social activity, and marketplace events — even when the app is closed or backgrounded. Users can manage notification preferences per category from profile settings.

## Problem

- Users miss new messages when the app is not open.
- Farmers have no way to know when someone follows them or comments on their post.
- Consumers have no way to be notified when a followed farmer posts a new listing or updates an order.
- The app is a PWA with next-pwa already configured, but no push infrastructure exists.

## Solution

Use FCM with two separate service workers: next-pwa's auto-generated `/sw.js` for caching (untouched), and a manually written `/firebase-messaging-sw.js` for background push handling. A new `notifications` domain handles all push logic. Triggers are added inline to existing Server Actions.

## Architecture

### New Domain: `src/domains/notifications/`

```
src/domains/notifications/
  actions/
    save-push-token.ts          # saves FCM token for authenticated user
    delete-push-token.ts        # removes token on logout or permission revoke
  queries/
    get-user-tokens.ts          # fetches all FCM tokens for a user
    get-notification-preferences.ts
  lib/
    send-notification.ts        # sends push via Firebase Admin SDK
    notification-types.ts       # payload builders per event type
  components/
    push-permission-prompt.tsx  # bottom banner asking for browser permission
    notification-settings.tsx   # per-category toggle switches in profile settings
  schemas/
    validation.ts
  index.ts
```

### Service Worker

`public/firebase-messaging-sw.js` — manually maintained file placed in `public/`. Initializes Firebase app with `NEXT_PUBLIC_FIREBASE_*` config, registers `onBackgroundMessage`, displays native notification with title/body/icon, and sets `data.url` for deep linking. next-pwa and `/sw.js` are not modified.

On `notificationclick`: calls `clients.openWindow(data.url)` or focuses an existing tab at that URL.

### Firebase Initialization

**Admin SDK** (server-side singleton): `src/shared/lib/firebase-admin.ts`
Required env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

**Client SDK**: `src/shared/lib/firebase-client.ts`
Required env vars: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`

## Database Schema

### `push_subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| id | text (cuid2) | PK |
| userId | text | FK → users.id, onDelete cascade |
| fcmToken | text | unique |
| createdAt | timestamp with tz | |

### `notification_preferences`

| Column | Type | Default |
|--------|------|---------|
| userId | text | PK, FK → users.id |
| messages | boolean | true |
| social | boolean | true |
| marketplace | boolean | true |
| updatedAt | timestamp with tz | |

Record is created on first save-push-token call if it doesn't exist (upsert with defaults).

## Notification Triggers

All triggers are fire-and-forget (`sendNotification()` called after DB write, errors do not block the action response).

| Action | Recipient | Category | Deep Link |
|--------|-----------|----------|-----------|
| `send-message.ts` | All conversation members except sender | messages | `/messages/[conversationId]` |
| `toggle-follow.ts` | Followed user | social | `/profile/[followerId]` |
| `add-comment.ts` | Post author | social | `/posts/[postId]` |
| `toggle-reaction.ts` (add only) | Post author | social | `/posts/[postId]` |
| `create-listing.ts` | All followers of the farmer (batch) | marketplace | `/listings/[listingId]` |
| `orders/` create | Farmer (seller) | marketplace | `/farmer/orders/[orderId]` |
| `orders/` status update | Buyer | marketplace | `/orders/[orderId]` |

**Pre-send logic:**
1. Fetch recipient's FCM tokens from `push_subscriptions`
2. Check `notification_preferences` — skip if category is disabled (default all true; treat missing row as all true)
3. Skip if sender = recipient
4. On FCM error `messaging/invalid-registration-token` or `messaging/registration-token-not-registered` → delete token from DB

## Frontend Flow

### Permission Request (`push-permission-prompt.tsx`)

Rendered in the authenticated root layout (client component). On mount:
1. Check `Notification.permission`
2. If `"default"` and no `push-dismissed` localStorage key → show bottom banner
3. On "Włącz powiadomienia" click → call `requestPermission()` → on grant call `getToken()` → call `save-push-token` Server Action
4. On dismiss → set `push-dismissed` in localStorage, hide banner

### Profile Settings (`notification-settings.tsx`)

New section in the profile settings page. Three shadcn `Switch` components (Wiadomości / Aktywność społeczna / Marketplace). Each toggle calls a Server Action immediately (optimistic update). If push is not granted, shows a "Włącz powiadomienia push" button instead of toggles.

### Foreground Messages

Client component (in authenticated layout) subscribes to `onMessage()` from Firebase SDK. When a push arrives while app is active, shows a shadcn toast with title, body, and a link button. Browser suppresses native notifications when the page is focused — toast replaces them.

## Tests

### Unit tests — notifications domain

- `send-notification.ts`: mock Firebase Admin SDK; assert correct payload shape per event type; assert invalid tokens are removed from DB
- `save-push-token.ts` / `delete-push-token.ts`: auth guard, input validation, DB write
- `get-notification-preferences.ts`: returns all-true defaults when row is missing

### Integration tests — existing actions

In `send-message`, `toggle-follow`, `add-comment`, `toggle-reaction`, `create-listing`, and order actions: mock `sendNotification` at module boundary, assert it is called with correct arguments. Firebase SDK is not invoked in these tests.

## Error Handling

- FCM errors are caught and logged (`console.error`), never re-thrown
- Invalid/expired tokens are deleted automatically from `push_subscriptions`
- `sendEachForMulticast` is used for batch sends (listing to all followers); partial failures are handled per-token
- Missing `push_subscriptions` row → send nothing silently
- Missing `notification_preferences` row → treat as all categories enabled

## i18n

All UI strings (banner text, toast labels, settings section heading, toggle labels) go in `messages/pl.json` under a `notifications` namespace.
