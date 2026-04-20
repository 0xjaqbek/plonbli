# Umami Analytics Integration — Design Spec

**Date:** 2026-04-20
**Status:** Approved

## Overview

Integrate Umami Analytics into plonbli for full pageview and custom event tracking. Umami is deployed as a separate Vercel project with its own Neon PostgreSQL database, isolated from the main application. The main plonbli app embeds the Umami tracking script and exposes a typed analytics domain for consistent event tracking across the codebase.

---

## Infrastructure

### Umami Deployment

- **Repo:** Fork of `umami-software/umami`, maintained as a separate repository (e.g., `plonbli-analytics`)
- **Hosting:** Separate Vercel project (Node.js runtime, not serverless functions)
- **URL:** `analytics.plonbli.com` (custom subdomain via Vercel custom domain)
- **Environment variables:**
  - `DATABASE_URL` — points to the dedicated Neon project (not the main app DB)
  - `APP_SECRET` — random secret string for Umami session signing

### Database

- **Provider:** New Neon project, separate from the main plonbli database
- **Isolation:** No shared connection, no shared credentials — full separation
- **Migration:** Umami runs its own migrations automatically on startup — no manual step needed
- **Tier:** Neon free tier is sufficient for Umami's data volume

### Tracking Script in plonbli

- **Env vars added to plonbli:**
  - `NEXT_PUBLIC_UMAMI_WEBSITE_ID` — the website ID from Umami dashboard
  - `NEXT_PUBLIC_UMAMI_URL` — URL of the Umami instance (`https://analytics.plonbli.com`)
- **Script placement:** `src/app/[locale]/layout.tsx` via Next.js `<Script>` with `strategy="afterInteractive"`
- **Pageview tracking:** Automatic — Umami is SPA-aware and tracks Next.js App Router navigation natively

---

## Analytics Domain in plonbli

### File Structure

```
src/domains/analytics/
  index.ts              # public API — re-exports useAnalytics, trackEvent, EVENTS, AnalyticsScript
  events.ts             # EVENTS const — single source of truth for all event names
  use-analytics.ts      # useAnalytics() hook for React components
  track-event.ts        # trackEvent() typed function (usable outside React)
  analytics-script.tsx  # <AnalyticsScript /> component (Next.js Script wrapper)
  types.ts              # EventName, EventProperties mapped types
```

### Design Principles

- **Single source of truth for event names:** All event names live in `events.ts` as a `EVENTS` const object. No string literals in callsites.
- **Typed properties:** Each event name maps to its expected properties via `EventProperties` in `types.ts`. TypeScript enforces correct payload shape at callsites.
- **SSR-safe:** `useAnalytics()` and `trackEvent()` guard against `window` being undefined (SSR, script not loaded). Calls are no-ops when Umami is unavailable.
- **No circular dependencies:** The `analytics` domain does not import from any other domain. Other domains import from analytics.
- **Encapsulated script:** `<AnalyticsScript />` reads env vars internally — consumers don't manage Umami configuration directly.

### API

```ts
// Importing in a component
import { useAnalytics, EVENTS } from "@/domains/analytics";

// Inside a React component
const { trackEvent } = useAnalytics();
trackEvent(EVENTS.LISTING_VIEWED, { listingId, farmerId, category });

// Outside React (e.g., in an event handler without hooks)
import { trackEvent, EVENTS } from "@/domains/analytics";
trackEvent(EVENTS.ORDER_PLACED, { orderId, farmerId, itemCount, totalValue });
```

---

## Event Catalog

All 18 custom events, grouped by domain. Pageviews are tracked automatically.

### Auth

| Event | Properties |
|-------|-----------|
| `auth.registered` | `{ method: 'email' \| 'google' \| 'facebook' }` |
| `auth.logged_in` | `{ method: 'email' \| 'google' \| 'facebook' }` |
| `auth.logged_out` | — |

### Marketplace

| Event | Properties |
|-------|-----------|
| `listing.viewed` | `{ listingId: string, farmerId: string, category: string }` |
| `listing.created` | `{ listingId: string, category: string, hasAvailability: boolean }` |
| `listing.availability_updated` | `{ listingId: string, availability: string }` |
| `cart.item_added` | `{ listingId: string, farmerId: string, price: number }` |
| `cart.item_removed` | `{ listingId: string }` |
| `order.placed` | `{ orderId: string, farmerId: string, itemCount: number, totalValue: number }` |
| `order.status_changed` | `{ orderId: string, fromStatus: string, toStatus: string }` |

### Social

| Event | Properties |
|-------|-----------|
| `post.created` | `{ hasMedia: boolean }` |
| `post.liked` | — |
| `group.joined` | `{ groupId: string }` |
| `event.rsvp` | `{ eventId: string }` |

### Messaging

| Event | Properties |
|-------|-----------|
| `conversation.started` | `{ recipientRole: 'farmer' \| 'consumer' \| 'both' }` |
| `message.sent` | — |

### Onboarding

| Event | Properties |
|-------|-----------|
| `role.upgraded_to_farmer` | — |

---

## Integration Points

Where callsites are added in the existing codebase:

| Event | File |
|-------|------|
| `auth.registered` | auth domain — after successful registration |
| `auth.logged_in` | auth domain — after successful sign-in |
| `auth.logged_out` | auth domain — on sign-out |
| `listing.viewed` | `src/domains/marketplace/components/product-detail.tsx` |
| `listing.created` | `src/domains/marketplace/actions/create-listing.ts` → client callback |
| `listing.availability_updated` | `src/domains/marketplace/components/availability-select.tsx` |
| `cart.item_added` / `cart.item_removed` | `src/domains/orders/actions/add-to-cart.ts` → client callback |
| `order.placed` | `src/domains/orders/actions/create-order.ts` → client callback |
| `order.status_changed` | orders domain — status update action → client callback |
| `post.created` | social domain — post creation callback |
| `post.liked` | social domain — like action callback |
| `group.joined` | social domain — group join callback |
| `event.rsvp` | social domain — RSVP callback |
| `conversation.started` | `src/domains/messaging/components/chat-view.tsx` |
| `message.sent` | `src/domains/messaging/components/chat-view.tsx` |
| `role.upgraded_to_farmer` | auth/profile domain — role upgrade callback |

---

## Out of Scope

- Server-side (server-to-server) event tracking via Umami API
- Embedding the Umami dashboard inside the plonbli UI
- Custom analytics dashboard built in Next.js
- Alerting or automated reporting from Umami data
