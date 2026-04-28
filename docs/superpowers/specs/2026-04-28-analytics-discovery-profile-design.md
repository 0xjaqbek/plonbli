# Analytics: Discovery & Profile Events — Design Spec

**Date:** 2026-04-28
**Status:** Approved

## Overview

Extend the existing Umami analytics catalog with 5 new events covering marketplace discovery (search, filters, map) and profile/listing interactions (profile view, share). Builds on the existing `src/domains/analytics/` domain — no infrastructure changes needed.

---

## Event Catalog

### Discovery

| Event | Properties | Callsite |
|-------|-----------|---------|
| `search.performed` | `{ query: string }` | `search-filters.tsx` → `handleSearch` |
| `filter.applied` | `{ filterType: "category" \| "method" \| "sort" \| "location"; value: string }` | `search-filters.tsx` → `updateParams` + `handleLocationChange` |
| `map.viewed` | `{ farmerCount: number }` | `farmer-map.tsx` → `useEffect` on mount |

### Profile & Listing

| Event | Properties | Callsite |
|-------|-----------|---------|
| `producer_profile.viewed` | `{ farmerId: string }` | `farmer-profile-view.tsx` → `useEffect` on mount |
| `listing.shared` | `{ entityType: "FARMER" \| "EVENT" \| "CROP_LOG" \| "PRODUCT" \| "PROXY_FARMER"; entityId: string }` | `share-button.tsx` → `handleShare` |

---

## Implementation Details

### `types.ts` additions

```ts
"search.performed":        { query: string };
"filter.applied":          { filterType: "category" | "method" | "sort" | "location"; value: string };
"map.viewed":              { farmerCount: number };
"producer_profile.viewed": { farmerId: string };
"listing.shared":          { entityType: "FARMER" | "EVENT" | "CROP_LOG" | "PRODUCT" | "PROXY_FARMER"; entityId: string };
```

### `events.ts` additions

```ts
SEARCH_PERFORMED:         "search.performed",
FILTER_APPLIED:           "filter.applied",
MAP_VIEWED:               "map.viewed",
PRODUCER_PROFILE_VIEWED:  "producer_profile.viewed",
LISTING_SHARED:           "listing.shared",
```

### Callsite notes

**`search-filters.tsx`**
- `handleSearch`: after calling `updateParams("q", ...)`, fire `search.performed` with `{ query }`. Empty string query (clearing search) is also tracked.
- `updateParams`: fire `filter.applied` with `{ filterType: key as FilterType, value }`. Only fire when value is non-empty and not `"all"` (i.e., when a filter is actually being set, not cleared).
- `handleLocationChange`: fire `filter.applied` with `{ filterType: "location", value: first non-null of commune → county → voivodeship }`. Only fire when at least one location value is set.

**`farmer-map.tsx`**
- Already has `useEffect([], mount)` — fire `map.viewed` with `{ farmerCount: resolved.length }` after `setMapReady(true)`. `resolved` is memoized and available in scope.

**`farmer-profile-view.tsx`**
- Add `useEffect([], mount)` to fire `producer_profile.viewed` with `{ farmerId: farmer.id }`. Component is already `"use client"`.

**`share-button.tsx`**
- In `handleShare`, fire `listing.shared` with `{ entityType, entityId }` before the router push.

---

## Out of Scope

- `listing.favorite_added` — favorites feature does not exist yet; track when building it
- `search.no_results` — deduce from Umami pageview data (`/marketplace?q=xyz` with low time-on-page)
- `listing.impression` — `listing.viewed` (existing event) covers intent; impression tracking skipped
