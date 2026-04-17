# Product Edit Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow farmers to edit all fields of existing listings (product metadata + pricing/delivery) and fix the broken `mine=1` filter on the marketplace page.

**Architecture:** Extend `ListingForm` with optional `listingId`/`initialValues` props to support edit mode; add a `update-listing` server action; create a new `/marketplace/[id]/edit` route; fix `getListings` to accept an optional `userId` for mine filtering; add `ListingCardActions` client component for inline edit/delete in "Moje oferty".

**Tech Stack:** Next.js 15 Server Actions, Drizzle ORM, React Hook Form + Zod, next-intl, Supabase Storage, Vitest

---

## File Map

| File | Change |
|---|---|
| `src/domains/marketplace/actions/update-listing.ts` | **New** — server action |
| `tests/domains/marketplace/actions/update-listing.test.ts` | **New** — unit tests |
| `src/domains/marketplace/index.ts` | Modify — export `updateListing` |
| `src/domains/marketplace/queries/get-listings.ts` | Modify — optional `userId` param, mine filter fix |
| `messages/pl.json` | Modify — add `marketplace.saveChanges` key |
| `src/domains/marketplace/components/listing-form.tsx` | Modify — add `listingId?` and `initialValues?` props, edit mode submit |
| `src/app/[locale]/(main)/marketplace/[id]/edit/page.tsx` | **New** — edit route |
| `src/domains/marketplace/components/product-detail.tsx` | Modify — add Edit button next to Delete |
| `src/domains/marketplace/components/listing-card-actions.tsx` | **New** — client component for card actions |
| `src/domains/marketplace/components/listing-card.tsx` | Modify — add `showActions?` prop |
| `src/app/[locale]/(main)/marketplace/page.tsx` | Modify — pass `userId` for mine filter, `showActions` to cards |

---

## Task 1: `update-listing` action (TDD)

**Files:**
- Create: `tests/domains/marketplace/actions/update-listing.test.ts`
- Create: `src/domains/marketplace/actions/update-listing.ts`
- Modify: `src/domains/marketplace/index.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// tests/domains/marketplace/actions/update-listing.test.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateListing } from "@/domains/marketplace/actions/update-listing";

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

vi.mock("@/shared/lib/supabase", () => ({
  supabaseAdmin: {
    storage: {
      from: vi.fn().mockReturnValue({
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
  STORAGE_BUCKET: "images",
}));

describe("updateListing", () => {
  const validInput = {
    name: "Pomidory malinowe",
    description: "Swiezo zebrane",
    categoryId: "cat-1",
    method: "ECO" as const,
    tags: ["eko"],
    images: ["https://example.com/img.jpg"],
    price: 12.5,
    unit: "KG" as const,
    quantityAvailable: 100,
    availability: "AVAILABLE" as const,
    deliveryOptions: [{ type: "PICKUP" as const, address: "ul. Polna 1" }],
  };

  const mockListing = {
    id: "list-1",
    productId: "prod-1",
    product: {
      id: "prod-1",
      farmerId: "user-1",
      images: ["https://example.com/img.jpg"],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns field errors for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);

    const result = await updateListing("list-1", { ...validInput, name: "", price: -1 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toBeDefined();
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Oferta nie istnieje");
  });

  it("returns error when user is not the listing owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-2" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Brak uprawnien");
  });

  it("updates product and listing and returns success", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");
    vi.mocked(auth).mockResolvedValueOnce({ user: { id: "user-1" } } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(mockListing as any);

    const result = await updateListing("list-1", validInput);
    expect(result.success).toBe(true);
    expect(db.update).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```
npx vitest run tests/domains/marketplace/actions/update-listing.test.ts
```

Expected: FAIL with "Cannot find module '@/domains/marketplace/actions/update-listing'"

- [ ] **Step 3: Write the action**

```typescript
// src/domains/marketplace/actions/update-listing.ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { products, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import { supabaseAdmin, STORAGE_BUCKET } from "@/shared/lib/supabase";
import {
  createListingSchema,
  type CreateListingInput,
} from "../schemas/validation";

type UpdateListingResult =
  | { success: true }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function updateListing(
  listingId: string,
  input: CreateListingInput
): Promise<UpdateListingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
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

  // Delete removed images from storage (fire-and-forget)
  const removedImages = listing.product.images.filter(
    (url) => !images.includes(url)
  );
  if (removedImages.length > 0) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const paths = removedImages.map((url) =>
      url.replace(
        `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/`,
        ""
      )
    );
    supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(paths)
      .catch((err) =>
        console.error("Failed to delete images from storage:", err)
      );
  }

  await db
    .update(products)
    .set({ name, description, categoryId, method, tags, images })
    .where(eq(products.id, listing.productId));

  await db
    .update(listings)
    .set({
      price: String(price),
      unit,
      quantityAvailable: quantityAvailable ? String(quantityAvailable) : null,
      availability,
      validUntil: validUntil ? new Date(validUntil) : null,
      deliveryOptions,
    })
    .where(eq(listings.id, listingId));

  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```
npx vitest run tests/domains/marketplace/actions/update-listing.test.ts
```

Expected: 5 tests PASS

- [ ] **Step 5: Export from domain index**

In `src/domains/marketplace/index.ts`, add one line:

```typescript
export { updateListing } from "./actions/update-listing";
```

- [ ] **Step 6: Commit**

```bash
git add tests/domains/marketplace/actions/update-listing.test.ts \
        src/domains/marketplace/actions/update-listing.ts \
        src/domains/marketplace/index.ts
git commit -m "feat(marketplace): add update-listing server action"
```

---

## Task 2: Fix `get-listings` mine filter

**Files:**
- Modify: `src/domains/marketplace/queries/get-listings.ts`

The current `getListings` always excludes `OUT_OF_STOCK` listings. In mine mode farmers must see all their listings regardless of availability. Also, filtering by `farmerId` is currently missing entirely.

- [ ] **Step 1: Update `getListings` signature and conditions**

In `src/domains/marketplace/queries/get-listings.ts`, change the function signature and the initial conditions line:

Old:
```typescript
export async function getListings(filters: SearchListingsInput) {
  const conditions = [ne(listings.availability, "OUT_OF_STOCK")];
```

New:
```typescript
export async function getListings(filters: SearchListingsInput, userId?: string) {
  // In mine mode: show all farmer's listings including OUT_OF_STOCK
  const conditions = userId
    ? [eq(products.farmerId, userId)]
    : [ne(listings.availability, "OUT_OF_STOCK")];
```

`eq` is already imported at the top of the file — no new imports needed.

- [ ] **Step 2: Commit**

```bash
git add src/domains/marketplace/queries/get-listings.ts
git commit -m "fix(marketplace): add userId filter for mine mode in getListings"
```

---

## Task 3: Add translation key + extend `ListingForm` for edit mode

**Files:**
- Modify: `messages/pl.json`
- Modify: `src/domains/marketplace/components/listing-form.tsx`

- [ ] **Step 1: Add translation key**

In `messages/pl.json`, find the `"marketplace"` object and add after `"createListing"`:

```json
"saveChanges": "Zapisz zmiany",
```

So the marketplace block starts like:
```json
"marketplace": {
  "title": "Rynek",
  "browse": "Przegladaj oferty",
  "createListing": "Dodaj oferte",
  "saveChanges": "Zapisz zmiany",
  ...
```

- [ ] **Step 2: Extend `ListingForm` — add imports and update props**

In `src/domains/marketplace/components/listing-form.tsx`:

Add import for `updateListing` after the `createListing` import:
```typescript
import { createListing } from "../actions/create-listing";
import { updateListing } from "../actions/update-listing";
```

Also add `CreateListingInput` to the import from schemas (it's used for the prop type):
```typescript
import {
  createListingSchema,
  type CreateListingInput,
} from "../schemas/validation";
```

Wait — `listing-form.tsx` currently defines its own local `formSchema` and `FormInput` type. The new `initialValues` prop should use `CreateListingInput` from the shared schema. Add this import at the top (after existing imports):

```typescript
import type { CreateListingInput } from "../schemas/validation";
```

Update the props interface:

Old:
```typescript
interface ListingFormProps {
  categories: Category[];
}
```

New:
```typescript
interface ListingFormProps {
  categories: Category[];
  listingId?: string;
  initialValues?: CreateListingInput;
}
```

- [ ] **Step 3: Update function signature and delivery option states**

Old:
```typescript
export function ListingForm({ categories }: ListingFormProps) {
  // ...
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [dropPointEnabled, setDropPointEnabled] = useState(false);

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupHours, setPickupHours] = useState("");
  const [deliveryRadius, setDeliveryRadius] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [deliveryMinAmount, setDeliveryMinAmount] = useState("");
  const [dropPointAddress, setDropPointAddress] = useState("");
```

New:
```typescript
export function ListingForm({ categories, listingId, initialValues }: ListingFormProps) {
  // ...
  const initialPickup = initialValues?.deliveryOptions?.find((o) => o.type === "PICKUP");
  const initialDelivery = initialValues?.deliveryOptions?.find((o) => o.type === "DELIVERY");
  const initialDropPoint = initialValues?.deliveryOptions?.find((o) => o.type === "DROP_POINT");

  const [pickupEnabled, setPickupEnabled] = useState(!!initialPickup);
  const [deliveryEnabled, setDeliveryEnabled] = useState(!!initialDelivery);
  const [dropPointEnabled, setDropPointEnabled] = useState(!!initialDropPoint);

  const [pickupAddress, setPickupAddress] = useState(initialPickup?.address ?? "");
  const [pickupHours, setPickupHours] = useState(initialPickup?.hours ?? "");
  const [deliveryRadius, setDeliveryRadius] = useState(
    initialDelivery?.radius !== undefined ? String(initialDelivery.radius) : ""
  );
  const [deliveryCost, setDeliveryCost] = useState(
    initialDelivery?.cost !== undefined ? String(initialDelivery.cost) : ""
  );
  const [deliveryMinAmount, setDeliveryMinAmount] = useState(
    initialDelivery?.minAmount !== undefined ? String(initialDelivery.minAmount) : ""
  );
  const [dropPointAddress, setDropPointAddress] = useState(
    initialDropPoint?.address ?? ""
  );
```

- [ ] **Step 4: Update `useForm` defaultValues**

Old:
```typescript
  const form = useForm<FormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      method: "CONVENTIONAL",
      tags: [],
      images: [],
      price: 0,
      unit: "KG",
      availability: "AVAILABLE",
    },
  });
```

New:
```typescript
  const form = useForm<FormInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialValues
      ? {
          name: initialValues.name,
          description: initialValues.description ?? "",
          categoryId: initialValues.categoryId,
          method: initialValues.method ?? "CONVENTIONAL",
          tags: initialValues.tags ?? [],
          images: initialValues.images ?? [],
          price: initialValues.price,
          unit: initialValues.unit,
          quantityAvailable: initialValues.quantityAvailable,
          availability: initialValues.availability ?? "AVAILABLE",
          validUntil: initialValues.validUntil,
        }
      : {
          name: "",
          description: "",
          categoryId: "",
          method: "CONVENTIONAL",
          tags: [],
          images: [],
          price: 0,
          unit: "KG",
          availability: "AVAILABLE",
        },
  });
```

- [ ] **Step 5: Update `onSubmit` to use `updateListing` in edit mode**

Old:
```typescript
  function onSubmit(data: FormInput) {
    const deliveryOptions = buildDeliveryOptions();
    if (deliveryOptions.length === 0) {
      setServerError("Dodaj przynajmniej jedna opcje dostawy");
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const result = await createListing({
        ...data,
        deliveryOptions,
      });
      if (result.success) {
        router.push(`/marketplace/${result.listingId}`);
      } else if (!result.success && result.error) {
        setServerError(result.error);
      }
    });
  }
```

New:
```typescript
  function onSubmit(data: FormInput) {
    const deliveryOptions = buildDeliveryOptions();
    if (deliveryOptions.length === 0) {
      setServerError("Dodaj przynajmniej jedna opcje dostawy");
      return;
    }

    setServerError(null);
    startTransition(async () => {
      const payload = { ...data, deliveryOptions };
      if (listingId) {
        const result = await updateListing(listingId, payload);
        if (result.success) {
          router.push(`/marketplace/${listingId}`);
        } else if (!result.success && result.error) {
          setServerError(result.error);
        }
      } else {
        const result = await createListing(payload);
        if (result.success) {
          router.push(`/marketplace/${result.listingId}`);
        } else if (!result.success && result.error) {
          setServerError(result.error);
        }
      }
    });
  }
```

- [ ] **Step 6: Update submit button label**

Old:
```tsx
        <Button type="submit" className="w-full" disabled={isPending}>
          {tMarketplace("createListing")}
        </Button>
```

New:
```tsx
        <Button type="submit" className="w-full" disabled={isPending}>
          {tMarketplace(listingId ? "saveChanges" : "createListing")}
        </Button>
```

- [ ] **Step 7: Commit**

```bash
git add messages/pl.json \
        src/domains/marketplace/components/listing-form.tsx
git commit -m "feat(marketplace): extend ListingForm for edit mode"
```

---

## Task 4: Create edit route page

**Files:**
- Create: `src/app/[locale]/(main)/marketplace/[id]/edit/page.tsx`

- [ ] **Step 1: Create the page**

```typescript
// src/app/[locale]/(main)/marketplace/[id]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getListing } from "@/domains/marketplace/queries/get-listing";
import { getCategories } from "@/domains/marketplace/queries/get-categories";
import { ListingForm } from "@/domains/marketplace/components/listing-form";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const listing = await getListing(id);
  if (!listing) notFound();

  if (listing.product.farmerId !== session.user.id) {
    redirect(`/marketplace/${id}`);
  }

  const categories = await getCategories();

  const initialValues = {
    name: listing.product.name,
    description: listing.product.description ?? "",
    categoryId: listing.product.categoryId,
    method: listing.product.method,
    tags: listing.product.tags,
    images: listing.product.images,
    price: Number(listing.price),
    unit: listing.unit,
    quantityAvailable: listing.quantityAvailable
      ? Number(listing.quantityAvailable)
      : undefined,
    availability: listing.availability,
    validUntil: listing.validUntil?.toISOString(),
    deliveryOptions: listing.deliveryOptions,
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Edytuj ogłoszenie</h1>
      <ListingForm
        categories={categories}
        listingId={id}
        initialValues={initialValues}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/[locale]/(main)/marketplace/[id]/edit/page.tsx"
git commit -m "feat(marketplace): add edit listing page route"
```

---

## Task 5: Add edit button to `product-detail.tsx`

**Files:**
- Modify: `src/domains/marketplace/components/product-detail.tsx`

- [ ] **Step 1: Add edit button**

`product-detail.tsx` already imports `Link` — no new import needed.

Find the `isOwner` block near the bottom of the file (line ~260):

Old:
```tsx
      {isOwner && (
        <>
          <Separator />
          {!showConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
            >
              {tCommon("delete")}
            </Button>
```

New:
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
```

And close the new `<div>` before the `</>` — find the existing closing structure:

Old:
```tsx
          )}
        </>
      )}
```

New:
```tsx
          )}
          </div>
        </>
      )}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/marketplace/components/product-detail.tsx
git commit -m "feat(marketplace): add edit button to product detail page"
```

---

## Task 6: Create `ListingCardActions` client component

**Files:**
- Create: `src/domains/marketplace/components/listing-card-actions.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/domains/marketplace/components/listing-card-actions.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { deleteListing } from "../actions/delete-listing";

interface ListingCardActionsProps {
  listingId: string;
}

export function ListingCardActions({ listingId }: ListingCardActionsProps) {
  const t = useTranslations("common");
  const tProduct = useTranslations("product");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteListing(listingId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/marketplace/${listingId}/edit`}>{t("edit")}</Link>
      </Button>
      {!showConfirm ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowConfirm(true)}
        >
          {t("delete")}
        </Button>
      ) : (
        <>
          <span className="text-xs text-destructive">
            {tProduct("confirmDelete")}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            {t("delete")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowConfirm(false)}
          >
            {t("cancel")}
          </Button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/marketplace/components/listing-card-actions.tsx
git commit -m "feat(marketplace): add ListingCardActions component for mine view"
```

---

## Task 7: Add `showActions` to `ListingCard` + wire marketplace page

**Files:**
- Modify: `src/domains/marketplace/components/listing-card.tsx`
- Modify: `src/app/[locale]/(main)/marketplace/page.tsx`

- [ ] **Step 1: Update `ListingCard`**

Add `ListingCardActions` import at the top of `listing-card.tsx`:

```typescript
import { ListingCardActions } from "./listing-card-actions";
```

Update the props interface:

Old:
```typescript
interface ListingCardProps {
  item: ListingWithDetails;
  hideImage?: boolean;
}
```

New:
```typescript
interface ListingCardProps {
  item: ListingWithDetails;
  hideImage?: boolean;
  showActions?: boolean;
}
```

Update function signature:

Old:
```typescript
export function ListingCard({ item, hideImage }: ListingCardProps) {
```

New:
```typescript
export function ListingCard({ item, hideImage, showActions }: ListingCardProps) {
```

Change the return — wrap in `<div>` instead of `<Link>`, keep `<Link>` around the card content only:

Old:
```tsx
  return (
    <Link href={`/marketplace/${listing.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        {/* ...card content... */}
      </Card>
    </Link>
  );
```

New:
```tsx
  return (
    <div>
      <Link href={`/marketplace/${listing.id}`}>
        <Card className="h-full hover:shadow-md transition-shadow">
          {/* ...card content unchanged... */}
        </Card>
      </Link>
      {showActions && <ListingCardActions listingId={listing.id} />}
    </div>
  );
```

- [ ] **Step 2: Update marketplace page**

In `src/app/[locale]/(main)/marketplace/page.tsx`:

Add `auth` import after the existing imports:
```typescript
import { auth } from "@/domains/auth/lib/auth";
```

Inside the page function, add session retrieval and userId logic. Replace:

Old:
```typescript
  const parsed = searchListingsSchema.safeParse(params);
  const filters = parsed.success
    ? parsed.data
    : { sort: "newest" as const, page: 1 };

  const [{ results, page, totalPages }, allCategories] =
    await Promise.all([getListings(filters), getCategories()]);
```

New:
```typescript
  const parsed = searchListingsSchema.safeParse(params);
  const filters = parsed.success
    ? parsed.data
    : { sort: "newest" as const, page: 1 };

  const isMine = params.mine === "1";
  const session = isMine ? await auth() : null;
  const userId = isMine ? session?.user?.id : undefined;

  const [{ results, page, totalPages }, allCategories] =
    await Promise.all([getListings(filters, userId), getCategories()]);
```

Pass `showActions` to each `ListingCard`:

Old:
```tsx
            {results.map((item) => (
              <ListingCard key={item.listing.id} item={item} />
            ))}
```

New:
```tsx
            {results.map((item) => (
              <ListingCard key={item.listing.id} item={item} showActions={isMine} />
            ))}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/marketplace/components/listing-card.tsx \
        src/app/[locale]/(main)/marketplace/page.tsx
git commit -m "feat(marketplace): wire showActions to ListingCard and fix mine filter in page"
```

---

## Final verification

- [ ] **Run all marketplace tests**

```
npx vitest run tests/domains/marketplace
```

Expected: all tests PASS

- [ ] **Manual smoke test checklist**
  1. Navigate to `/marketplace` — all listings visible, search works
  2. Navigate to `/marketplace?mine=1` as a farmer — only your listings, including OUT_OF_STOCK ones
  3. Each card in mine view has Edit + Delete buttons
  4. Click Edit on a card → goes to `/marketplace/[id]/edit` with form prefilled
  5. Edit a field, submit → redirects back to listing detail with updated data
  6. Delete a listing from the card → card disappears after refresh
  7. Go to a listing detail page you own → Edit button appears next to Delete
  8. Edit button on detail page → same edit form
  9. Try to navigate to `/marketplace/[someone-elses-id]/edit` — redirects back to listing
