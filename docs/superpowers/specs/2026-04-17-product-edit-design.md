# Product Edit Feature — Design Spec

**Date:** 2026-04-17
**Status:** Approved

## Overview

Farmers need to be able to correct typos, update descriptions, change prices, manage images, and adjust delivery options on existing listings. This spec covers the full edit flow plus a fix for broken `mine=1` filtering in the marketplace.

## Scope

1. **Edit listing** — all fields editable (product metadata + listing pricing/delivery)
2. **Edit entry points** — listing detail page + "Moje oferty" panel
3. **Image editing** — add new images / remove existing ones individually
4. **Fix `mine=1` filter** — `/marketplace?mine=1` currently shows all listings instead of farmer's own

## Architecture

### New: `update-listing` Action

**File:** `src/domains/marketplace/actions/update-listing.ts`

Steps:
1. Check session (`auth()`) — return `{ error: "UNAUTHORIZED" }` if not authenticated
2. Validate input with existing `createListingSchema` (same fields as create)
3. Fetch listing + product — return `{ error: "NOT_FOUND" }` if missing
4. Verify `product.farmerId === session.user.id` — return `{ error: "FORBIDDEN" }` if not owner
5. Diff `oldImages` vs `newImages` — delete removed files from Supabase Storage (fire-and-forget, log errors but don't block)
6. Update `products`: `name`, `description`, `categoryId`, `method`, `tags`, `images`
7. Update `listings`: `price`, `unit`, `quantityAvailable`, `availability`, `validUntil`, `deliveryOptions`
8. Return `{ success: true }` or field-level validation errors (same format as `create-listing`)

### Modified: `ListingForm` Component

**File:** `src/domains/marketplace/components/listing-form.tsx`

Add two optional props:
```ts
listingId?: string           // presence signals edit mode
initialValues?: CreateListingInput  // prefills all form fields
```

- If `listingId` is provided → call `updateListing(listingId, data)` on submit
- Otherwise → call `createListing(data)` (existing behavior, unchanged)
- On edit success → redirect to `/marketplace/[listingId]`
- `ImageUpload` component already supports initial values via `value` prop — no changes needed

### New: Edit Route

**File:** `src/app/[locale]/(main)/marketplace/[id]/edit/page.tsx`

1. Require authentication — redirect to login if no session
2. Fetch listing by `id` — 404 if not found
3. Verify `listing.product.farmerId === session.user.id` — redirect to `/marketplace/[id]` if not owner
4. Fetch categories for dropdown
5. Map listing data to `initialValues` shape
6. Render `<ListingForm listingId={id} initialValues={initialValues} categories={categories} />`

### Modified: `product-detail.tsx`

Add "Edytuj" button next to the existing "Usuń" button (already owner-gated):
```tsx
<Button asChild variant="outline">
  <Link href={`/marketplace/${listing.id}/edit`}>Edytuj</Link>
</Button>
```

### Modified: `ListingCard` Component

**File:** `src/domains/marketplace/components/listing-card.tsx`

Add optional prop:
```ts
showActions?: boolean
```

When `showActions=true`, render Edit and Delete buttons below the card content.

### Modified: Marketplace Page + `get-listings` Query

**Fix `mine=1` filter:**

- `get-listings.ts` query: add optional `userId` param — when provided, add `where product.farmerId = userId` condition
- Marketplace page (`/marketplace/page.tsx`): when `searchParams.mine === "1"`, pass `session.user.id` as `userId` to the query
- "Moje oferty" panel: pass `showActions={true}` to each `ListingCard`

## Error Handling

| Scenario | Behavior |
|---|---|
| Not authenticated | Action returns `{ error: "UNAUTHORIZED" }`, page redirects to login |
| Listing not found | Action returns `{ error: "NOT_FOUND" }`, page shows 404 |
| Not owner | Action returns `{ error: "FORBIDDEN" }`, page redirects to listing detail |
| Validation errors | Per-field errors, same format as create — React Hook Form displays them |
| Storage delete fails | Log error, do not block DB update — orphan file in Storage is acceptable |

## Testing

New test file: `tests/domains/marketplace/actions/update-listing.test.ts`

Test cases:
- Happy path: updates both product and listing fields
- Unauthorized: returns error when not authenticated
- Forbidden: returns error when user is not the listing owner
- Not found: returns error for non-existent listing ID
- Validation: returns field errors for invalid input

No new component tests (consistent with existing test coverage in the domain).
No new query tests (get-listings is not currently tested).

## Files Changed

| File | Change |
|---|---|
| `src/domains/marketplace/actions/update-listing.ts` | **New** |
| `tests/domains/marketplace/actions/update-listing.test.ts` | **New** |
| `src/app/[locale]/(main)/marketplace/[id]/edit/page.tsx` | **New** |
| `src/domains/marketplace/components/listing-form.tsx` | Modified — edit mode props |
| `src/domains/marketplace/components/listing-card.tsx` | Modified — `showActions` prop |
| `src/domains/marketplace/components/product-detail.tsx` | Modified — edit button |
| `src/domains/marketplace/queries/get-listings.ts` | Modified — `mine` filter fix |
| `src/app/[locale]/(main)/marketplace/page.tsx` | Modified — pass userId for mine filter, showActions |
| `src/domains/marketplace/index.ts` | Modified — export update-listing |
