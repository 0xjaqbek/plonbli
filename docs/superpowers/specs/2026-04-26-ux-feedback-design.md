# UX Feedback: Button Loading States & Notification Badge Clearing

**Date:** 2026-04-26
**Status:** Approved

## Problem

Two related UX issues making the app feel unresponsive:

1. **Button feedback** — after tapping a button that triggers a Server Action, there is no visual indication that the action is in progress. Buttons are `disabled` during `isPending` but show no spinner, making the UI appear frozen.

2. **Notification badges not clearing** — the red dot on the messages and orders icons in the NavBar does not disappear after reading messages or viewing orders without a full page refresh. This is because `hasUnread` and `hasUnseenOrders` are fetched once in the Server Component layout and never updated client-side.

## Solution Overview

**Approach B — isLoading Button + BadgeContext**

- Extend the shared `Button` component with an `isLoading` prop that renders a spinner
- Extract badge state from the server-rendered layout into a client-side `BadgeContext` that can be cleared after server actions confirm success

## Design

### 1. Button — `isLoading` prop

**File:** `src/shared/ui/button.tsx`

Add `isLoading?: boolean` to `ButtonProps`. When `true`:
- Button is automatically `disabled`
- A `<Loader2 className="h-4 w-4 animate-spin" />` icon appears before children
- For icon-only buttons, spinner replaces children

Usage pattern (drop-in replacement across all components using `useTransition`):
```tsx
// Before
<Button disabled={isPending} onClick={handle}>Label</Button>

// After
<Button isLoading={isPending} onClick={handle}>Label</Button>
```

All existing components that use `isPending` from `useTransition` get updated to pass `isLoading={isPending}`.

### 2. BadgeContext

**New file:** `src/shared/lib/badge-context.tsx`

Client-side context initialized with server-fetched values at layout render time.

**State:**
```ts
{ hasUnread: boolean, hasUnseenOrders: boolean }
```

**Methods:**
```ts
clearUnread()         // called after markAsRead succeeds
clearUnseenOrders()   // called after markOrderSeen succeeds
```

**Hook:** `useBadges()` — used by NavBar to read current badge state.

**Data flow:**
```
layout.tsx (Server Component)
  → queries DB for hasUnread + hasUnseenOrders (unchanged)
  → passes values to <BadgeProvider initialUnread={x} initialUnseenOrders={y}>

BadgeProvider (Client Component)
  → holds state locally, exposes clearUnread / clearUnseenOrders

NavBar (Client Component)
  → const { hasUnread, hasUnseenOrders } = useBadges()  (no longer receives props)

ChatView
  → after markAsRead() success → clearUnread()

Order components
  → after markOrderSeen() success → clearUnseenOrders()
```

The layout continues to fetch badge state from the DB once on page load — this is unchanged. BadgeContext only enables client-side clearing without a full `router.refresh()`.

### 3. Integration Points

| File | Change |
|------|--------|
| `src/shared/ui/button.tsx` | Add `isLoading` prop with spinner |
| `src/shared/lib/badge-context.tsx` | New file — context, provider, hook |
| `src/app/[locale]/(main)/layout.tsx` | Wrap children in `BadgeProvider` |
| `src/shared/ui/nav-bar.tsx` | Remove props, use `useBadges()` |
| `src/domains/messaging/components/chat-view.tsx` | Call `clearUnread()` after markAsRead |
| Order components (call sites of `markOrderSeen`) | Call `clearUnseenOrders()` after success |
| All components with `disabled={isPending}` | Replace with `isLoading={isPending}` |

## Scope

- 1 new file: `badge-context.tsx` (~60 lines)
- ~6-8 files modified
- No new API endpoints
- No polling
- No changes to Server Actions or DB queries

## Out of Scope

- Hover animations (not needed — isLoading spinner solves the feedback problem)
- Real-time badge sync across tabs (polling) — not needed for this use case
- Performance optimization of Server Actions themselves
