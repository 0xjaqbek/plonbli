# Availability Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow farmers to change listing availability via a quick inline selector on the detail page and via the edit form (plus add the missing `validUntil` field to the form).

**Architecture:** New `update-availability` server action updates a single field; new `AvailabilitySelect` client component wraps a `Select` and calls the action on change; `ListingForm` gets two new form fields (`availability`, `validUntil`) that were already in the schema but missing from the JSX.

**Tech Stack:** Next.js 15 Server Actions, Drizzle ORM, Zod, React Hook Form, shadcn/ui Select, next-intl, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/domains/marketplace/actions/update-availability.ts` | **New** |
| `tests/domains/marketplace/actions/update-availability.test.ts` | **New** |
| `src/domains/marketplace/index.ts` | Modify — export `updateAvailability` |
| `messages/pl.json` | Modify — add `product.availabilityLabel`, `product.validUntilLabel` |
| `src/domains/marketplace/components/availability-select.tsx` | **New** |
| `src/domains/marketplace/components/product-detail.tsx` | Modify — add `AvailabilitySelect` in owner section |
| `src/domains/marketplace/components/listing-form.tsx` | Modify — add `availability` select + `validUntil` date input |

---

## Task 1: `update-availability` action (TDD)

**Files:**
- Create: `tests/domains/marketplace/actions/update-availability.test.ts`
- Create: `src/domains/marketplace/actions/update-availability.ts`
- Modify: `src/domains/marketplace/index.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/domains/marketplace/actions/update-availability.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateAvailability } from "@/domains/marketplace/actions/update-availability";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockWhere = vi.fn().mockResolvedValue(undefined);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
  const mockDb = {
    query: {
      listings: { findFirst: vi.fn() },
    },
    update: mockUpdate,
  };
  return { db: mockDb };
});

describe("updateAvailability", () => {
  const mockListing = {
    id: "list-1",
    product: { id: "prod-1", farmerId: "user-1" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateAvailability("list-1", "AVAILABLE");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error for invalid availability value", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await updateAvailability("list-1", "INVALID");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await updateAvailability("list-1", "AVAILABLE");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Oferta nie istnieje");
  });

  it("returns error when user is not the listing owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-2" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateAvailability("list-1", "AVAILABLE");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("updates availability and returns success", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateAvailability("list-1", "SEASONAL");
    expect(result.success).toBe(true);
    expect(db.update).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/domains/marketplace/actions/update-availability.test.ts
```

Expected: FAIL — "Cannot find module '@/domains/marketplace/actions/update-availability'"

- [ ] **Step 3: Write the action**

```typescript
// src/domains/marketplace/actions/update-availability.ts
"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/shared/db";
import { listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

const availabilitySchema = z.enum(["AVAILABLE", "SEASONAL", "OUT_OF_STOCK"]);

type UpdateAvailabilityResult =
  | { success: true }
  | { success: false; error: string };

export async function updateAvailability(
  listingId: string,
  availability: string
): Promise<UpdateAvailabilityResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = availabilitySchema.safeParse(availability);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowa wartosc dostepnosci" };
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    with: { product: true },
  });

  if (!listing) {
    return { success: false, error: "Oferta nie istnieje" };
  }

  if (listing.product.farmerId !== session.user.id) {
    return { success: false, error: "Brak uprawnien" };
  }

  await db
    .update(listings)
    .set({ availability: parsed.data })
    .where(eq(listings.id, listingId));

  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/domains/marketplace/actions/update-availability.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Export from domain index**

In `src/domains/marketplace/index.ts`, add:
```typescript
export { updateAvailability } from "./actions/update-availability";
```

- [ ] **Step 6: Commit**

```bash
git add tests/domains/marketplace/actions/update-availability.test.ts \
        src/domains/marketplace/actions/update-availability.ts \
        src/domains/marketplace/index.ts
git commit -m "feat(marketplace): add update-availability server action"
```

---

## Task 2: Translation keys + `AvailabilitySelect` component

**Files:**
- Modify: `messages/pl.json`
- Create: `src/domains/marketplace/components/availability-select.tsx`

- [ ] **Step 1: Add translation keys to `messages/pl.json`**

Find the `"product"` object and add after `"validUntil"` (or any existing key in the block):

```json
"availabilityLabel": "Dostępność",
"validUntilLabel": "Ważne do",
```

- [ ] **Step 2: Create `AvailabilitySelect` component**

```typescript
// src/domains/marketplace/components/availability-select.tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { updateAvailability } from "../actions/update-availability";

type Availability = "AVAILABLE" | "SEASONAL" | "OUT_OF_STOCK";

interface AvailabilitySelectProps {
  listingId: string;
  value: Availability;
}

export function AvailabilitySelect({ listingId, value }: AvailabilitySelectProps) {
  const t = useTranslations("product");
  const tMarketplace = useTranslations("marketplace");
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState<Availability>(value);

  function handleChange(newValue: string) {
    const next = newValue as Availability;
    setCurrent(next);
    startTransition(async () => {
      const result = await updateAvailability(listingId, newValue);
      if (!result.success) {
        setCurrent(value); // revert on error
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{t("availabilityLabel")}:</span>
      <Select value={current} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AVAILABLE">{tMarketplace("available")}</SelectItem>
          <SelectItem value="SEASONAL">{tMarketplace("seasonal")}</SelectItem>
          <SelectItem value="OUT_OF_STOCK">{tMarketplace("outOfStock")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add messages/pl.json \
        src/domains/marketplace/components/availability-select.tsx
git commit -m "feat(marketplace): add AvailabilitySelect component"
```

---

## Task 3: Add `AvailabilitySelect` to `product-detail.tsx`

**Files:**
- Modify: `src/domains/marketplace/components/product-detail.tsx`

- [ ] **Step 1: Add import**

At the top of `product-detail.tsx`, add after the existing imports:

```typescript
import { AvailabilitySelect } from "./availability-select";
```

- [ ] **Step 2: Add component inside `isOwner` section**

Find the `isOwner` block (around line 260). It currently looks like:

```tsx
      {isOwner && (
        <>
          <Separator />
          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit button + Delete confirm */}
          </div>
        </>
      )}
```

Add `<AvailabilitySelect>` after the buttons div:

```tsx
      {isOwner && (
        <>
          <Separator />
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <Link href={`/marketplace/${listing.id}/edit`}>
                {tCommon("edit")}
              </Link>
            </Button>
            {!showConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
              >
                {tCommon("delete")}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-destructive">
                  {t("confirmDelete")}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  {tCommon("delete")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                >
                  {tCommon("cancel")}
                </Button>
              </div>
            )}
          </div>
          <AvailabilitySelect listingId={listing.id} value={listing.availability} />
        </>
      )}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/marketplace/components/product-detail.tsx
git commit -m "feat(marketplace): add availability quick-select to product detail"
```

---

## Task 4: Add `availability` + `validUntil` fields to `ListingForm`

**Files:**
- Modify: `src/domains/marketplace/components/listing-form.tsx`

Both fields are already in `formSchema` and `defaultValues` — only JSX is missing.

- [ ] **Step 1: Add `availability` Select field**

In `listing-form.tsx`, find the closing `</FormField>` of the `quantityAvailable` field (after the `Input type="number"` for quantity). Add this block immediately after it, before the delivery options `<div>`:

```tsx
        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("availabilityLabel")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="AVAILABLE">{tMarketplace("available")}</SelectItem>
                  <SelectItem value="SEASONAL">{tMarketplace("seasonal")}</SelectItem>
                  <SelectItem value="OUT_OF_STOCK">{tMarketplace("outOfStock")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
```

- [ ] **Step 2: Add `validUntil` date field**

Immediately after the `availability` field above, add:

```tsx
        <FormField
          control={form.control}
          name="validUntil"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("validUntilLabel")}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? field.value.slice(0, 10) : ""}
                  onChange={(e) =>
                    field.onChange(e.target.value || undefined)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/marketplace/components/listing-form.tsx
git commit -m "feat(marketplace): add availability and validUntil fields to listing form"
```

---

## Final verification

- [ ] **Run all marketplace tests**

```
npx vitest run tests/domains/marketplace
```

Expected: all tests PASS (28 existing + 5 new = 33 total)

- [ ] **Manual smoke test checklist**
  1. Open a listing you own — `AvailabilitySelect` appears below Edit/Delete buttons
  2. Change availability to "Sezonowe" — updates immediately, badge on page reflects new value after refresh
  3. Change to "Niedostepne" — updates correctly
  4. Go to `/marketplace/[id]/edit` — `availability` select shows current value, `validUntil` date input visible
  5. Edit availability in form, save — redirects back to listing with correct badge
  6. Set `validUntil` date, save — data saved correctly
  7. Non-owner cannot access the select (not rendered)
