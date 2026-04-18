# Availability Edit Feature — Design Spec

**Date:** 2026-04-18
**Status:** Approved

## Overview

Farmers currently cannot change listing availability (`AVAILABLE`, `SEASONAL`, `OUT_OF_STOCK`) through the UI — it defaults to `AVAILABLE` on creation and stays fixed. This spec adds two ways to change it: a quick inline selector on the listing detail page, and fields in the existing edit form.

## Scope

1. **Quick selector** — `AvailabilitySelect` component on listing detail page (owner only), updates availability without navigating away
2. **Edit form fields** — add `availability` select + `validUntil` date input to `ListingForm` (both already in schema, missing only JSX)

## Architecture

### New: `update-availability` Action

**File:** `src/domains/marketplace/actions/update-availability.ts`

Steps:
1. Check session — return `{ success: false, error: "Nie jestes zalogowany" }` if not authenticated
2. Validate `availability` with Zod: `z.enum(["AVAILABLE", "SEASONAL", "OUT_OF_STOCK"])`
3. Fetch listing with product relation — return `{ success: false, error: "Oferta nie istnieje" }` if not found
4. Verify `product.farmerId === session.user.id` — return `{ success: false, error: "Brak uprawnien" }` if not owner
5. Update `listings.availability` only
6. Return `{ success: true }` or `{ success: false, error: string }`

### New: `AvailabilitySelect` Component

**File:** `src/domains/marketplace/components/availability-select.tsx`

- `"use client"` — client component
- Props: `listingId: string`, `value: "AVAILABLE" | "SEASONAL" | "OUT_OF_STOCK"`
- Uses `useTransition` — select disabled while saving
- Calls `updateAvailability(listingId, newValue)` on `onValueChange`
- Uses `useTranslations("marketplace")` for option labels (`available`, `seasonal`, `outOfStock`)
- No submit button — fires on change

### Modified: `product-detail.tsx`

Render `<AvailabilitySelect>` inside the `isOwner` section, below the Edit/Delete buttons:

```tsx
{isOwner && (
  <>
    <Separator />
    <div className="flex items-center gap-2 flex-wrap">
      <Button variant="outline" asChild>...</Button>  {/* Edit */}
      {/* Delete confirm UI */}
    </div>
    <AvailabilitySelect listingId={listing.id} value={listing.availability} />
  </>
)}
```

### Modified: `ListingForm`

Add two new form fields after `quantityAvailable` (both already in `formSchema` and `defaultValues`):

**`availability` Select:**
```tsx
<Select onValueChange={field.onChange} value={field.value}>
  <SelectItem value="AVAILABLE">{tMarketplace("available")}</SelectItem>
  <SelectItem value="SEASONAL">{tMarketplace("seasonal")}</SelectItem>
  <SelectItem value="OUT_OF_STOCK">{tMarketplace("outOfStock")}</SelectItem>
</Select>
```

**`validUntil` date Input:**
```tsx
<Input
  type="date"
  value={field.value ? field.value.slice(0, 10) : ""}
  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
/>
```

### Translations

Add to `messages/pl.json` under `product`:
```json
"availabilityLabel": "Dostępność",
"validUntilLabel": "Ważne do"
```

Option labels (`available`, `seasonal`, `outOfStock`) already exist under `marketplace.*`.

## Error Handling

| Scenario | Behavior |
|---|---|
| Not authenticated | Returns error, select re-enabled |
| Not owner | Returns error, select re-enabled |
| Listing not found | Returns error, select re-enabled |
| Network error | `catch` block, select re-enabled, no visible error (silent fail) |

## Testing

New test file: `tests/domains/marketplace/actions/update-availability.test.ts`

Test cases:
- Returns error when not authenticated
- Returns error when listing not found
- Returns error when not owner
- Returns error for invalid availability value
- Updates listing availability and returns success

No component tests (consistent with existing coverage).

## Files Changed

| File | Change |
|---|---|
| `src/domains/marketplace/actions/update-availability.ts` | **New** |
| `tests/domains/marketplace/actions/update-availability.test.ts` | **New** |
| `src/domains/marketplace/components/availability-select.tsx` | **New** |
| `src/domains/marketplace/components/product-detail.tsx` | Modified — add `AvailabilitySelect` |
| `src/domains/marketplace/components/listing-form.tsx` | Modified — add `availability` + `validUntil` fields |
| `src/domains/marketplace/index.ts` | Modified — export `updateAvailability` |
| `messages/pl.json` | Modified — add `availabilityLabel`, `validUntilLabel` |
