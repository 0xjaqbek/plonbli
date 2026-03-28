# Phase 2: Marketplace — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a functional marketplace where farmers list products and consumers browse, search, and find local food producers.

**Architecture:** Extends the monolithic Next.js 15 app with a new `marketplace` domain. Products and listings stored in PostgreSQL via Drizzle. Search uses SQL ILIKE with category/voivodeship/price filters. Location filtering via voivodeship string matching. Products inherit location from the farmer's profile. Delivery options stored as JSONB on listings.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL (Neon), Zod, next-intl, Vitest

---

## File Structure

```
src/
  domains/
    marketplace/
      index.ts                            # barrel export
      schemas/validation.ts               # Zod schemas (create listing, search)
      actions/create-listing.ts           # server action: create product + listing
      actions/delete-listing.ts           # server action: delete listing + product
      queries/get-listings.ts             # search/browse with filters + pagination
      queries/get-listing.ts              # single listing with product + farmer
      queries/get-farmer-listings.ts      # all listings by farmer
      queries/get-categories.ts           # all categories
      components/listing-card.tsx         # card for browse grid
      components/listing-form.tsx         # create listing form
      components/search-filters.tsx       # search bar + filter controls
      components/product-detail.tsx       # full product detail view
      components/farmer-profile-view.tsx  # farmer info + their listings
  shared/
    db/schema/
      categories.ts                       # categories table
      products.ts                         # products table + farming_method enum
      listings.ts                         # listings table + unit/availability enums + DeliveryOption type
      relations.ts                        # Drizzle relations for all tables
      index.ts                            # updated barrel export
  app/[locale]/(main)/
    marketplace/
      page.tsx                            # browse listings
      create/page.tsx                     # create listing (farmers only)
      [id]/page.tsx                       # listing detail
    farmers/
      [id]/page.tsx                       # farmer profile
scripts/
  seed-categories.ts                      # seed category data
messages/
  pl.json                                # updated with marketplace translations
tests/
  domains/
    marketplace/
      schemas/validation.test.ts
      actions/create-listing.test.ts
      actions/delete-listing.test.ts
```

---

## Task 1: Categories Schema + Seed

**Files:**
- Create: `src/shared/db/schema/categories.ts`
- Modify: `src/shared/db/schema/index.ts`
- Create: `scripts/seed-categories.ts`

- [ ] **Step 1: Create categories table schema**

Create `src/shared/db/schema/categories.ts`:

```typescript
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const categories = pgTable("categories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: text("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
```

Note: `parentId` is a self-referencing text column (not a foreign key constraint) to simplify schema push. Referential integrity is managed at application level.

- [ ] **Step 2: Update schema barrel export**

Update `src/shared/db/schema/index.ts`:

```typescript
export { users, userRoleEnum, type User, type NewUser } from "./users";
export { authAccounts, type AuthAccount } from "./auth-accounts";
export {
  sessions,
  verificationTokens,
  type Session,
} from "./sessions";
export { categories, type Category, type NewCategory } from "./categories";
```

- [ ] **Step 3: Push schema to database**

```bash
npx drizzle-kit push
```

Expected: `Changes applied` — categories table created.

- [ ] **Step 4: Create seed script**

Create `scripts/seed-categories.ts`:

```typescript
import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { categories } from "../src/shared/db/schema/categories";

loadEnvConfig(process.cwd());

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const CATEGORIES = [
  { name: "Warzywa", slug: "warzywa", sortOrder: 1 },
  { name: "Owoce", slug: "owoce", sortOrder: 2 },
  { name: "Nabial", slug: "nabial", sortOrder: 3 },
  { name: "Mieso", slug: "mieso", sortOrder: 4 },
  { name: "Pieczywo", slug: "pieczywo", sortOrder: 5 },
  { name: "Przetwory", slug: "przetwory", sortOrder: 6 },
  { name: "Miod", slug: "miod", sortOrder: 7 },
  { name: "Jaja", slug: "jaja", sortOrder: 8 },
  { name: "Ziola", slug: "ziola", sortOrder: 9 },
  { name: "Inne", slug: "inne", sortOrder: 10 },
];

async function seed() {
  console.log("Seeding categories...");
  await db.insert(categories).values(CATEGORIES).onConflictDoNothing();
  console.log(`Seeded ${CATEGORIES.length} categories`);
}

seed().catch(console.error);
```

- [ ] **Step 5: Run seed**

```bash
npx tsx scripts/seed-categories.ts
```

Expected: `Seeded 10 categories`

- [ ] **Step 6: Commit**

```bash
git add src/shared/db/schema/categories.ts src/shared/db/schema/index.ts scripts/seed-categories.ts
git commit -m "feat: add categories schema and seed with 10 product categories"
```

---

## Task 2: Products & Listings Schema + Relations

**Files:**
- Create: `src/shared/db/schema/products.ts`, `src/shared/db/schema/listings.ts`, `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create products table schema**

Create `src/shared/db/schema/products.ts`:

```typescript
import {
  pgTable,
  text,
  varchar,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { categories } from "./categories";

export const farmingMethodEnum = pgEnum("farming_method", [
  "ECO",
  "CONVENTIONAL",
  "OTHER",
]);

export const products = pgTable("products", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull().default(""),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id),
  images: text("images").array().notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  method: farmingMethodEnum("method").notNull().default("CONVENTIONAL"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
```

- [ ] **Step 2: Create listings table schema**

Create `src/shared/db/schema/listings.ts`:

```typescript
import {
  pgTable,
  text,
  timestamp,
  numeric,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { products } from "./products";

export const unitEnum = pgEnum("unit_type", [
  "KG",
  "PIECE",
  "LITER",
  "BUNCH",
]);

export const availabilityEnum = pgEnum("availability_status", [
  "AVAILABLE",
  "SEASONAL",
  "OUT_OF_STOCK",
]);

export type DeliveryOption = {
  type: "PICKUP" | "DELIVERY" | "DROP_POINT";
  address?: string;
  radius?: number;
  minAmount?: number;
  cost?: number;
  hours?: string;
};

export const listings = pgTable("listings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  unit: unitEnum("unit").notNull(),
  quantityAvailable: numeric("quantity_available", {
    precision: 10,
    scale: 2,
  }),
  availability: availabilityEnum("availability")
    .notNull()
    .default("AVAILABLE"),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  deliveryOptions: jsonb("delivery_options")
    .$type<DeliveryOption[]>()
    .notNull()
    .default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Listing = typeof listings.$inferSelect;
export type NewListing = typeof listings.$inferInsert;
```

- [ ] **Step 3: Create Drizzle relations**

Create `src/shared/db/schema/relations.ts`:

```typescript
import { relations } from "drizzle-orm";
import { users } from "./users";
import { categories } from "./categories";
import { products } from "./products";
import { listings } from "./listings";

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  farmer: one(users, {
    fields: [products.farmerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  listings: many(listings),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  product: one(products, {
    fields: [listings.productId],
    references: [products.id],
  }),
}));
```

- [ ] **Step 4: Update schema barrel export**

Update `src/shared/db/schema/index.ts`:

```typescript
export { users, userRoleEnum, type User, type NewUser } from "./users";
export { authAccounts, type AuthAccount } from "./auth-accounts";
export {
  sessions,
  verificationTokens,
  type Session,
} from "./sessions";
export { categories, type Category, type NewCategory } from "./categories";
export {
  products,
  farmingMethodEnum,
  type Product,
  type NewProduct,
} from "./products";
export {
  listings,
  unitEnum,
  availabilityEnum,
  type Listing,
  type NewListing,
  type DeliveryOption,
} from "./listings";
export {
  categoriesRelations,
  productsRelations,
  listingsRelations,
} from "./relations";
```

- [ ] **Step 5: Push schema to database**

```bash
npx drizzle-kit push
```

Expected: `Changes applied` — products and listings tables created with enums.

- [ ] **Step 6: Commit**

```bash
git add src/shared/db/schema/products.ts src/shared/db/schema/listings.ts src/shared/db/schema/relations.ts src/shared/db/schema/index.ts
git commit -m "feat: add products and listings schema with relations"
```

---

## Task 3: Marketplace Validation Schemas + Tests

**Files:**
- Create: `src/domains/marketplace/schemas/validation.ts`, `src/domains/marketplace/index.ts`
- Test: `tests/domains/marketplace/schemas/validation.test.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p src/domains/marketplace/{schemas,actions,queries,components}
mkdir -p tests/domains/marketplace/{schemas,actions}
```

- [ ] **Step 2: Write failing tests for validation schemas**

Create `tests/domains/marketplace/schemas/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createListingSchema,
  searchListingsSchema,
} from "@/domains/marketplace/schemas/validation";

describe("createListingSchema", () => {
  const validListing = {
    name: "Pomidory malinowe",
    description: "Swiezo zebrane pomidory",
    categoryId: "cat-123",
    method: "ECO" as const,
    tags: ["eko", "sezonowe"],
    images: [],
    price: 12.5,
    unit: "KG" as const,
    quantityAvailable: 100,
    availability: "AVAILABLE" as const,
    deliveryOptions: [
      { type: "PICKUP" as const, address: "ul. Polna 1", hours: "Pn-Pt 8-16" },
    ],
  };

  it("accepts valid listing data", () => {
    const result = createListingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      price: -5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid unit", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      unit: "GALLON",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty delivery options", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      deliveryOptions: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts listing without optional fields", () => {
    const result = createListingSchema.safeParse({
      name: "Jablka",
      categoryId: "cat-1",
      method: "CONVENTIONAL",
      price: 5,
      unit: "KG",
      deliveryOptions: [{ type: "PICKUP" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing categoryId", () => {
    const result = createListingSchema.safeParse({
      ...validListing,
      categoryId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("searchListingsSchema", () => {
  it("accepts empty search (browse all)", () => {
    const result = searchListingsSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts full search params", () => {
    const result = searchListingsSchema.safeParse({
      q: "pomidory",
      category: "warzywa",
      voivodeship: "malopolskie",
      minPrice: "5",
      maxPrice: "20",
      method: "ECO",
      sort: "price_asc",
      page: "2",
    });
    expect(result.success).toBe(true);
  });

  it("defaults sort to newest", () => {
    const result = searchListingsSchema.safeParse({});
    if (result.success) {
      expect(result.data.sort).toBe("newest");
    }
  });

  it("defaults page to 1", () => {
    const result = searchListingsSchema.safeParse({});
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("rejects invalid sort", () => {
    const result = searchListingsSchema.safeParse({ sort: "random" });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/domains/marketplace/schemas/validation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Implement validation schemas**

Create `src/domains/marketplace/schemas/validation.ts`:

```typescript
import { z } from "zod";

const deliveryOptionSchema = z.object({
  type: z.enum(["PICKUP", "DELIVERY", "DROP_POINT"]),
  address: z.string().optional(),
  radius: z.coerce.number().positive().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  cost: z.coerce.number().nonnegative().optional(),
  hours: z.string().optional(),
});

export const createListingSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(255),
  description: z.string().max(5000).default(""),
  categoryId: z.string().min(1, "Kategoria jest wymagana"),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).default("CONVENTIONAL"),
  tags: z.array(z.string()).default([]),
  images: z.array(z.string().url()).default([]),
  price: z.coerce.number().positive("Cena musi byc wieksza od 0"),
  unit: z.enum(["KG", "PIECE", "LITER", "BUNCH"]),
  quantityAvailable: z.coerce.number().positive().optional(),
  availability: z
    .enum(["AVAILABLE", "SEASONAL", "OUT_OF_STOCK"])
    .default("AVAILABLE"),
  validUntil: z.string().optional(),
  deliveryOptions: z
    .array(deliveryOptionSchema)
    .min(1, "Dodaj przynajmniej jedna opcje dostawy"),
});

export const searchListingsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  voivodeship: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  method: z.enum(["ECO", "CONVENTIONAL", "OTHER"]).optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "name"])
    .default("newest"),
  page: z.coerce.number().default(1),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
export type DeliveryOptionInput = z.infer<typeof deliveryOptionSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/domains/marketplace/schemas/validation.test.ts
```

Expected: All 12 tests PASS.

- [ ] **Step 6: Create barrel export**

Create `src/domains/marketplace/index.ts`:

```typescript
export {
  createListingSchema,
  searchListingsSchema,
  type CreateListingInput,
  type SearchListingsInput,
  type DeliveryOptionInput,
} from "./schemas/validation";
```

- [ ] **Step 7: Commit**

```bash
git add src/domains/marketplace/ tests/domains/marketplace/
git commit -m "feat: add marketplace validation schemas with tests"
```

---

## Task 4: i18n — Marketplace Translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add marketplace translations**

Add the following sections to `messages/pl.json` (merge with existing content):

```json
{
  "marketplace": {
    "title": "Rynek",
    "browse": "Przegladaj oferty",
    "createListing": "Dodaj oferte",
    "noResults": "Brak wynikow",
    "search": "Szukaj produktow...",
    "filters": "Filtry",
    "clearFilters": "Wyczysc filtry",
    "allCategories": "Wszystkie kategorie",
    "allRegions": "Cala Polska",
    "priceRange": "Zakres cen",
    "minPrice": "Cena od",
    "maxPrice": "Cena do",
    "sortBy": "Sortuj",
    "sortNewest": "Najnowsze",
    "sortPriceAsc": "Cena rosnaco",
    "sortPriceDesc": "Cena malejaco",
    "sortName": "Nazwa A-Z",
    "perUnit": "za",
    "available": "Dostepne",
    "seasonal": "Sezonowe",
    "outOfStock": "Niedostepne",
    "showMore": "Pokaz wiecej"
  },
  "product": {
    "name": "Nazwa produktu",
    "description": "Opis",
    "category": "Kategoria",
    "method": "Metoda uprawy",
    "methodEco": "Ekologiczna",
    "methodConventional": "Konwencjonalna",
    "methodOther": "Inna",
    "tags": "Tagi",
    "tagsPlaceholder": "eko, sezonowe, lokalne...",
    "images": "Zdjecia",
    "imagesHint": "Adresy URL zdjec (po jednym na linie)",
    "price": "Cena",
    "unit": "Jednostka",
    "unitKg": "kg",
    "unitPiece": "sztuka",
    "unitLiter": "litr",
    "unitBunch": "peczek",
    "quantity": "Dostepna ilosc",
    "availability": "Dostepnosc",
    "validUntil": "Wazne do",
    "delivery": "Opcje dostawy",
    "deliveryPickup": "Odbior osobisty",
    "deliveryDelivery": "Dostawa",
    "deliveryDropPoint": "Punkt odbioru",
    "deliveryAddress": "Adres",
    "deliveryHours": "Godziny odbioru",
    "deliveryRadius": "Promien dostawy (km)",
    "deliveryCost": "Koszt dostawy (zl)",
    "deliveryMinAmount": "Min. zamowienie (zl)",
    "created": "Oferta dodana",
    "deleted": "Oferta usunieta",
    "confirmDelete": "Na pewno chcesz usunac te oferte?",
    "contactFarmer": "Skontaktuj sie z rolnikiem",
    "farmerProfile": "Profil rolnika",
    "onlyFarmers": "Tylko rolnicy moga dodawac oferty. Zmien role w profilu."
  },
  "farmer": {
    "profile": "Profil rolnika",
    "listings": "Oferty",
    "memberSince": "Na plonbli od",
    "location": "Lokalizacja",
    "noListings": "Ten rolnik nie ma jeszcze ofert"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add messages/pl.json
git commit -m "feat: add marketplace Polish translations"
```

---

## Task 5: Create Listing Server Action + Tests

**Files:**
- Create: `src/domains/marketplace/actions/create-listing.ts`
- Test: `tests/domains/marketplace/actions/create-listing.test.ts`

- [ ] **Step 1: Write failing test for create listing**

Create `tests/domains/marketplace/actions/create-listing.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createListing } from "@/domains/marketplace/actions/create-listing";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockReturning = vi.fn();
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
    query: {
      users: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("createListing", () => {
  const validInput = {
    name: "Pomidory malinowe",
    description: "Swiezo zebrane",
    categoryId: "cat-1",
    method: "ECO" as const,
    tags: ["eko"],
    images: [],
    price: 12.5,
    unit: "KG" as const,
    quantityAvailable: 100,
    availability: "AVAILABLE" as const,
    deliveryOptions: [
      { type: "PICKUP" as const, address: "ul. Polna 1" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createListing(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error when user is not a farmer", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      role: "CONSUMER",
    } as any);

    const result = await createListing(validInput);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      role: "FARMER",
    } as any);

    const result = await createListing({
      ...validInput,
      name: "",
      price: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toBeDefined();
  });

  it("creates product and listing on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      role: "FARMER",
    } as any);

    const mockInsert = vi.mocked(db.insert);
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([{ id: "prod-1" }]),
      }),
    } as any);
    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([{ id: "list-1" }]),
      }),
    } as any);

    const result = await createListing(validInput);
    expect(result.success).toBe(true);
    if (result.success) expect(result.listingId).toBe("list-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/marketplace/actions/create-listing.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement create listing action**

Create `src/domains/marketplace/actions/create-listing.ts`:

```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { products, listings, users } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createListingSchema,
  type CreateListingInput,
} from "../schemas/validation";

type CreateListingResult =
  | { success: true; listingId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createListing(
  input: CreateListingInput
): Promise<CreateListingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || (user.role !== "FARMER" && user.role !== "BOTH")) {
    return {
      success: false,
      error: "Tylko rolnicy moga dodawac oferty",
    };
  }

  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
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

  const [product] = await db
    .insert(products)
    .values({
      farmerId: session.user.id,
      name,
      description,
      categoryId,
      method,
      tags,
      images,
    })
    .returning({ id: products.id });

  const [listing] = await db
    .insert(listings)
    .values({
      productId: product.id,
      price: String(price),
      unit,
      quantityAvailable: quantityAvailable
        ? String(quantityAvailable)
        : null,
      availability,
      validUntil: validUntil ? new Date(validUntil) : null,
      deliveryOptions,
    })
    .returning({ id: listings.id });

  return { success: true, listingId: listing.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/domains/marketplace/actions/create-listing.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/marketplace/actions/create-listing.ts tests/domains/marketplace/actions/create-listing.test.ts
git commit -m "feat: add create-listing server action with role check"
```

---

## Task 6: Delete Listing Server Action + Tests

**Files:**
- Create: `src/domains/marketplace/actions/delete-listing.ts`
- Test: `tests/domains/marketplace/actions/delete-listing.test.ts`

- [ ] **Step 1: Write failing test for delete listing**

Create `tests/domains/marketplace/actions/delete-listing.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteListing } from "@/domains/marketplace/actions/delete-listing";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    query: {
      listings: { findFirst: vi.fn() },
    },
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
  };
  return { db: mockDb };
});

describe("deleteListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await deleteListing("listing-1");
    expect(result.success).toBe(false);
  });

  it("returns error when listing not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce(undefined);

    const result = await deleteListing("nonexistent");
    expect(result.success).toBe(false);
  });

  it("returns error when user is not the owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "listing-1",
      product: { farmerId: "user-2" },
    } as any);

    const result = await deleteListing("listing-1");
    expect(result.success).toBe(false);
  });

  it("deletes listing and product when user is owner", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.listings.findFirst).mockResolvedValueOnce({
      id: "listing-1",
      productId: "prod-1",
      product: { farmerId: "user-1" },
    } as any);

    const mockWhere = vi.fn();
    vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

    const result = await deleteListing("listing-1");
    expect(result.success).toBe(true);
    expect(db.delete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/marketplace/actions/delete-listing.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement delete listing action**

Create `src/domains/marketplace/actions/delete-listing.ts`:

```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { products, listings } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type DeleteListingResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteListing(
  listingId: string
): Promise<DeleteListingResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
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

  // Delete product cascades to listing
  await db.delete(products).where(eq(products.id, listing.productId));

  return { success: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/domains/marketplace/actions/delete-listing.test.ts
```

Expected: 4 tests PASS.

- [ ] **Step 5: Update barrel export**

Update `src/domains/marketplace/index.ts`:

```typescript
export {
  createListingSchema,
  searchListingsSchema,
  type CreateListingInput,
  type SearchListingsInput,
  type DeliveryOptionInput,
} from "./schemas/validation";
export { createListing } from "./actions/create-listing";
export { deleteListing } from "./actions/delete-listing";
```

- [ ] **Step 6: Commit**

```bash
git add src/domains/marketplace/actions/delete-listing.ts tests/domains/marketplace/actions/delete-listing.test.ts src/domains/marketplace/index.ts
git commit -m "feat: add delete-listing server action with ownership check"
```

---

## Task 7: Listing Queries

**Files:**
- Create: `src/domains/marketplace/queries/get-listings.ts`, `src/domains/marketplace/queries/get-listing.ts`, `src/domains/marketplace/queries/get-farmer-listings.ts`, `src/domains/marketplace/queries/get-categories.ts`

- [ ] **Step 1: Create get-categories query**

Create `src/domains/marketplace/queries/get-categories.ts`:

```typescript
import { asc } from "drizzle-orm";
import { db } from "@/shared/db";
import { categories } from "@/shared/db/schema";

export async function getCategories() {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.sortOrder));
}
```

- [ ] **Step 2: Create get-listings query (search + browse)**

Create `src/domains/marketplace/queries/get-listings.ts`:

```typescript
import {
  eq,
  and,
  ilike,
  gte,
  lte,
  desc,
  asc,
  sql,
  ne,
} from "drizzle-orm";
import { db } from "@/shared/db";
import {
  listings,
  products,
  users,
  categories,
} from "@/shared/db/schema";
import type { SearchListingsInput } from "../schemas/validation";

const ITEMS_PER_PAGE = 12;

export async function getListings(filters: SearchListingsInput) {
  const conditions = [ne(listings.availability, "OUT_OF_STOCK")];

  if (filters.q) {
    conditions.push(ilike(products.name, `%${filters.q}%`));
  }
  if (filters.category) {
    conditions.push(eq(categories.slug, filters.category));
  }
  if (filters.voivodeship) {
    conditions.push(eq(users.voivodeship, filters.voivodeship));
  }
  if (filters.minPrice !== undefined) {
    conditions.push(gte(listings.price, String(filters.minPrice)));
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(lte(listings.price, String(filters.maxPrice)));
  }
  if (filters.method) {
    conditions.push(eq(products.method, filters.method));
  }

  const orderMap = {
    newest: desc(listings.createdAt),
    price_asc: asc(listings.price),
    price_desc: desc(listings.price),
    name: asc(products.name),
  } as const;

  const orderClause = orderMap[filters.sort ?? "newest"];
  const offset = ((filters.page ?? 1) - 1) * ITEMS_PER_PAGE;

  const results = await db
    .select({
      listing: listings,
      product: products,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        voivodeship: users.voivodeship,
      },
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions))
    .orderBy(orderClause)
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(...conditions));

  return {
    results,
    total: count,
    page: filters.page ?? 1,
    totalPages: Math.ceil(count / ITEMS_PER_PAGE),
  };
}

export type ListingWithDetails = Awaited<
  ReturnType<typeof getListings>
>["results"][number];
```

- [ ] **Step 3: Create get-listing query (single detail)**

Create `src/domains/marketplace/queries/get-listing.ts`:

```typescript
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { listings } from "@/shared/db/schema";

export async function getListing(id: string) {
  return db.query.listings.findFirst({
    where: eq(listings.id, id),
    with: {
      product: {
        with: {
          farmer: true,
          category: true,
        },
      },
    },
  });
}

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListing>>>;
```

- [ ] **Step 4: Create get-farmer-listings query**

Create `src/domains/marketplace/queries/get-farmer-listings.ts`:

```typescript
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  listings,
  products,
  categories,
  users,
} from "@/shared/db/schema";

export async function getFarmerListings(farmerId: string) {
  return db
    .select({
      listing: listings,
      product: products,
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.farmerId, farmerId))
    .orderBy(desc(listings.createdAt));
}

export async function getFarmer(farmerId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, farmerId),
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/domains/marketplace/queries/
git commit -m "feat: add marketplace queries for listings, detail, and farmer"
```

---

## Task 8: UI Components — Listing Card + Search Filters

**Files:**
- Create: `src/domains/marketplace/components/listing-card.tsx`, `src/domains/marketplace/components/search-filters.tsx`

- [ ] **Step 1: Install shadcn badge component**

```bash
npx shadcn@latest add badge -y
```

- [ ] **Step 2: Create listing card component**

Create `src/domains/marketplace/components/listing-card.tsx`:

```tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { ListingWithDetails } from "../queries/get-listings";

const UNIT_LABELS: Record<string, string> = {
  KG: "kg",
  PIECE: "szt.",
  LITER: "l",
  BUNCH: "pęcz.",
};

const METHOD_COLORS: Record<string, string> = {
  ECO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CONVENTIONAL: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  OTHER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

interface ListingCardProps {
  item: ListingWithDetails;
}

export function ListingCard({ item }: ListingCardProps) {
  const { listing, product, farmer, category } = item;
  const t = useTranslations("marketplace");

  return (
    <Link href={`/marketplace/${listing.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        {product.images.length > 0 ? (
          <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] rounded-t-lg bg-muted flex items-center justify-center">
            <span className="text-4xl text-muted-foreground">🌱</span>
          </div>
        )}
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>{category.name}</span>
            <Badge
              variant="secondary"
              className={METHOD_COLORS[product.method]}
            >
              {product.method === "ECO" ? "EKO" : product.method === "CONVENTIONAL" ? "Konw." : "Inne"}
            </Badge>
          </div>
          <CardTitle className="text-base line-clamp-2">
            {product.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <p className="text-lg font-bold text-primary">
            {Number(listing.price).toFixed(2)} zł
            <span className="text-sm font-normal text-muted-foreground">
              {" "}
              / {UNIT_LABELS[listing.unit] ?? listing.unit}
            </span>
          </p>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <span>
            {farmer.name}
            {farmer.voivodeship ? ` · ${farmer.voivodeship}` : ""}
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Create search filters component**

Create `src/domains/marketplace/components/search-filters.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { VOIVODESHIPS } from "@/domains/geo";
import type { Category } from "@/shared/db/schema";

interface SearchFiltersProps {
  categories: Category[];
}

export function SearchFilters({ categories }: SearchFiltersProps) {
  const t = useTranslations("marketplace");
  const tProduct = useTranslations("product");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router]
  );

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParams("q", formData.get("q") as string);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          name="q"
          placeholder={t("search")}
          defaultValue={searchParams.get("q") ?? ""}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          {t("filters")}
        </Button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Select
          value={searchParams.get("category") ?? "all"}
          onValueChange={(v) => updateParams("category", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("voivodeship") ?? "all"}
          onValueChange={(v) => updateParams("voivodeship", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("allRegions")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allRegions")}</SelectItem>
            {VOIVODESHIPS.map((v) => (
              <SelectItem key={v} value={v}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("method") ?? "all"}
          onValueChange={(v) => updateParams("method", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={tProduct("method")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tProduct("method")}</SelectItem>
            <SelectItem value="ECO">{tProduct("methodEco")}</SelectItem>
            <SelectItem value="CONVENTIONAL">
              {tProduct("methodConventional")}
            </SelectItem>
            <SelectItem value="OTHER">{tProduct("methodOther")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("sort") ?? "newest"}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
            <SelectItem value="name">{t("sortName")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {searchParams.toString() && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/marketplace/components/listing-card.tsx src/domains/marketplace/components/search-filters.tsx
git commit -m "feat: add listing card and search filters components"
```

---

## Task 9: Marketplace Browse Page

**Files:**
- Create: `src/app/[locale]/(main)/marketplace/page.tsx`

- [ ] **Step 1: Create marketplace browse page**

```bash
mkdir -p src/app/\[locale\]/\(main\)/marketplace
```

Create `src/app/[locale]/(main)/marketplace/page.tsx`:

```tsx
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getListings } from "@/domains/marketplace/queries/get-listings";
import { getCategories } from "@/domains/marketplace/queries/get-categories";
import { searchListingsSchema } from "@/domains/marketplace/schemas/validation";
import { ListingCard } from "@/domains/marketplace/components/listing-card";
import { SearchFilters } from "@/domains/marketplace/components/search-filters";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("marketplace");
  const params = await searchParams;

  const parsed = searchListingsSchema.safeParse(params);
  const filters = parsed.success ? parsed.data : { sort: "newest" as const, page: 1 };

  const [{ results, total, page, totalPages }, allCategories] =
    await Promise.all([getListings(filters), getCategories()]);

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Button asChild>
          <Link href="/marketplace/create">
            <Plus className="h-4 w-4 mr-2" />
            {t("createListing")}
          </Link>
        </Button>
      </div>

      <Suspense>
        <SearchFilters categories={allCategories} />
      </Suspense>

      {results.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {t("noResults")}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((item) => (
              <ListingCard key={item.listing.id} item={item} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    asChild
                  >
                    <Link
                      href={`/marketplace?${new URLSearchParams({
                        ...Object.fromEntries(
                          Object.entries(params).filter(
                            ([, v]) => typeof v === "string"
                          ) as [string, string][]
                        ),
                        page: String(p),
                      }).toString()}`}
                    >
                      {p}
                    </Link>
                  </Button>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/\(main\)/marketplace/page.tsx
git commit -m "feat: add marketplace browse page with search and pagination"
```

---

## Task 10: Create Listing Page + Form

**Files:**
- Create: `src/domains/marketplace/components/listing-form.tsx`, `src/app/[locale]/(main)/marketplace/create/page.tsx`

- [ ] **Step 1: Install shadcn textarea component**

```bash
npx shadcn@latest add textarea -y
```

- [ ] **Step 2: Create listing form component**

Create `src/domains/marketplace/components/listing-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createListingSchema,
  type CreateListingInput,
} from "../schemas/validation";
import { createListing } from "../actions/create-listing";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import type { Category } from "@/shared/db/schema";

interface ListingFormProps {
  categories: Category[];
}

export function ListingForm({ categories }: ListingFormProps) {
  const t = useTranslations("product");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [dropPointEnabled, setDropPointEnabled] = useState(false);

  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupHours, setPickupHours] = useState("");
  const [deliveryRadius, setDeliveryRadius] = useState("");
  const [deliveryCost, setDeliveryCost] = useState("");
  const [deliveryMinAmount, setDeliveryMinAmount] = useState("");
  const [dropPointAddress, setDropPointAddress] = useState("");

  const form = useForm<Omit<CreateListingInput, "deliveryOptions">>({
    resolver: zodResolver(
      createListingSchema.omit({ deliveryOptions: true })
    ),
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

  function buildDeliveryOptions() {
    const options = [];
    if (pickupEnabled) {
      options.push({
        type: "PICKUP" as const,
        address: pickupAddress || undefined,
        hours: pickupHours || undefined,
      });
    }
    if (deliveryEnabled) {
      options.push({
        type: "DELIVERY" as const,
        radius: deliveryRadius ? Number(deliveryRadius) : undefined,
        cost: deliveryCost ? Number(deliveryCost) : undefined,
        minAmount: deliveryMinAmount ? Number(deliveryMinAmount) : undefined,
      });
    }
    if (dropPointEnabled) {
      options.push({
        type: "DROP_POINT" as const,
        address: dropPointAddress || undefined,
      });
    }
    return options;
  }

  function onSubmit(data: Omit<CreateListingInput, "deliveryOptions">) {
    const deliveryOptions = buildDeliveryOptions();
    if (deliveryOptions.length === 0) {
      setServerError(t("delivery") + " — " + "Dodaj przynajmniej jedna opcje");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Product info */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("name")}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("description")}</FormLabel>
              <FormControl>
                <Textarea rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("category")}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("category")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="method"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("method")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ECO">{t("methodEco")}</SelectItem>
                  <SelectItem value="CONVENTIONAL">
                    {t("methodConventional")}
                  </SelectItem>
                  <SelectItem value="OTHER">{t("methodOther")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tags")}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t("tagsPlaceholder")}
                  value={field.value?.join(", ") ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("price")} (zl)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("unit")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="KG">{t("unitKg")}</SelectItem>
                    <SelectItem value="PIECE">{t("unitPiece")}</SelectItem>
                    <SelectItem value="LITER">{t("unitLiter")}</SelectItem>
                    <SelectItem value="BUNCH">{t("unitBunch")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="quantityAvailable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("quantity")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Delivery options */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{t("delivery")}</h3>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={pickupEnabled}
                onChange={(e) => setPickupEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">{t("deliveryPickup")}</span>
            </label>
            {pickupEnabled && (
              <div className="ml-6 grid grid-cols-2 gap-2">
                <Input
                  placeholder={t("deliveryAddress")}
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
                <Input
                  placeholder={t("deliveryHours")}
                  value={pickupHours}
                  onChange={(e) => setPickupHours(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={deliveryEnabled}
                onChange={(e) => setDeliveryEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">{t("deliveryDelivery")}</span>
            </label>
            {deliveryEnabled && (
              <div className="ml-6 grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  placeholder={t("deliveryRadius")}
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("deliveryCost")}
                  value={deliveryCost}
                  onChange={(e) => setDeliveryCost(e.target.value)}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder={t("deliveryMinAmount")}
                  value={deliveryMinAmount}
                  onChange={(e) => setDeliveryMinAmount(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dropPointEnabled}
                onChange={(e) => setDropPointEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="font-medium">{t("deliveryDropPoint")}</span>
            </label>
            {dropPointEnabled && (
              <div className="ml-6">
                <Input
                  placeholder={t("deliveryAddress")}
                  value={dropPointAddress}
                  onChange={(e) => setDropPointAddress(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {t("created").replace("dodana", "dodaj")}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 3: Create the create listing page**

```bash
mkdir -p src/app/\[locale\]/\(main\)/marketplace/create
```

Create `src/app/[locale]/(main)/marketplace/create/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getCategories } from "@/domains/marketplace/queries/get-categories";
import { ListingForm } from "@/domains/marketplace/components/listing-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function CreateListingPage() {
  const t = await getTranslations("product");
  const tMarketplace = await getTranslations("marketplace");

  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || (user.role !== "FARMER" && user.role !== "BOTH")) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {t("onlyFarmers")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const categories = await getCategories();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{tMarketplace("createListing")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ListingForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/marketplace/components/listing-form.tsx src/app/\[locale\]/\(main\)/marketplace/create/
git commit -m "feat: add create listing page with form and farmer role check"
```

---

## Task 11: Product Detail Page

**Files:**
- Create: `src/domains/marketplace/components/product-detail.tsx`, `src/app/[locale]/(main)/marketplace/[id]/page.tsx`

- [ ] **Step 1: Create product detail component**

Create `src/domains/marketplace/components/product-detail.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { MapPin, Truck, Package, User } from "lucide-react";
import { deleteListing } from "../actions/delete-listing";
import type { ListingDetail } from "../queries/get-listing";

const UNIT_LABELS: Record<string, string> = {
  KG: "kg",
  PIECE: "szt.",
  LITER: "l",
  BUNCH: "pęcz.",
};

const AVAILABILITY_LABELS: Record<string, string> = {
  AVAILABLE: "Dostepne",
  SEASONAL: "Sezonowe",
  OUT_OF_STOCK: "Niedostepne",
};

const DELIVERY_LABELS: Record<string, string> = {
  PICKUP: "Odbior osobisty",
  DELIVERY: "Dostawa",
  DROP_POINT: "Punkt odbioru",
};

const DELIVERY_ICONS: Record<string, typeof MapPin> = {
  PICKUP: MapPin,
  DELIVERY: Truck,
  DROP_POINT: Package,
};

interface ProductDetailProps {
  listing: ListingDetail;
  isOwner: boolean;
}

export function ProductDetail({ listing, isOwner }: ProductDetailProps) {
  const t = useTranslations("product");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const { product } = listing;

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteListing(listing.id);
      if (result.success) {
        router.push("/marketplace");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Images */}
      {product.images.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {product.images.map((url, i) => (
            <div key={i} className="aspect-square overflow-hidden rounded-lg">
              <img
                src={url}
                alt={`${product.name} ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-[2/1] rounded-lg bg-muted flex items-center justify-center">
          <span className="text-6xl">🌱</span>
        </div>
      )}

      {/* Product info */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{product.category.name}</Badge>
          <Badge
            variant={product.method === "ECO" ? "default" : "secondary"}
          >
            {product.method === "ECO"
              ? "EKO"
              : product.method === "CONVENTIONAL"
                ? "Konwencjonalna"
                : "Inna"}
          </Badge>
          <Badge
            variant={
              listing.availability === "AVAILABLE"
                ? "default"
                : listing.availability === "SEASONAL"
                  ? "secondary"
                  : "destructive"
            }
          >
            {AVAILABILITY_LABELS[listing.availability]}
          </Badge>
        </div>

        <h1 className="text-2xl font-bold">{product.name}</h1>

        <p className="text-3xl font-bold text-primary mt-2">
          {Number(listing.price).toFixed(2)} zl
          <span className="text-lg font-normal text-muted-foreground">
            {" "}
            / {UNIT_LABELS[listing.unit]}
          </span>
        </p>

        {listing.quantityAvailable && (
          <p className="text-sm text-muted-foreground mt-1">
            {t("quantity")}: {Number(listing.quantityAvailable)}{" "}
            {UNIT_LABELS[listing.unit]}
          </p>
        )}
      </div>

      {product.description && (
        <>
          <Separator />
          <div>
            <h2 className="font-semibold mb-2">{t("description")}</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {product.description}
            </p>
          </div>
        </>
      )}

      {product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {product.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Delivery options */}
      <Separator />
      <div>
        <h2 className="font-semibold mb-3">{t("delivery")}</h2>
        <div className="space-y-3">
          {listing.deliveryOptions.map((opt, i) => {
            const Icon = DELIVERY_ICONS[opt.type] ?? Package;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {DELIVERY_LABELS[opt.type]}
                  </p>
                  {opt.address && (
                    <p className="text-sm text-muted-foreground">
                      {opt.address}
                    </p>
                  )}
                  {opt.hours && (
                    <p className="text-sm text-muted-foreground">
                      {opt.hours}
                    </p>
                  )}
                  {opt.radius && (
                    <p className="text-sm text-muted-foreground">
                      {t("deliveryRadius")}: {opt.radius} km
                    </p>
                  )}
                  {opt.cost !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {t("deliveryCost")}: {opt.cost} zl
                    </p>
                  )}
                  {opt.minAmount !== undefined && (
                    <p className="text-sm text-muted-foreground">
                      {t("deliveryMinAmount")}: {opt.minAmount} zl
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Farmer info */}
      <Separator />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {product.farmer.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {product.farmer.voivodeship && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {product.farmer.voivodeship}
            </p>
          )}
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href={`/farmers/${product.farmer.id}`}>
              {t("farmerProfile")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Owner actions */}
      {isOwner && (
        <>
          <Separator />
          {!showConfirm ? (
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
            >
              {t("confirmDelete").split("?")[0]}
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
                {t("confirmDelete").split(" ")[0]}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirm(false)}
              >
                Nie
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create listing detail page**

```bash
mkdir -p src/app/\[locale\]/\(main\)/marketplace/\[id\]
```

Create `src/app/[locale]/(main)/marketplace/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getListing } from "@/domains/marketplace/queries/get-listing";
import { ProductDetail } from "@/domains/marketplace/components/product-detail";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === listing.product.farmerId;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <ProductDetail listing={listing} isOwner={isOwner} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/marketplace/components/product-detail.tsx src/app/\[locale\]/\(main\)/marketplace/\[id\]/
git commit -m "feat: add product detail page with delivery info and delete"
```

---

## Task 12: Farmer Profile Page

**Files:**
- Create: `src/domains/marketplace/components/farmer-profile-view.tsx`, `src/app/[locale]/(main)/farmers/[id]/page.tsx`

- [ ] **Step 1: Create farmer profile view component**

Create `src/domains/marketplace/components/farmer-profile-view.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { MapPin, Calendar } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ListingCard } from "./listing-card";
import type { User } from "@/shared/db/schema";
import type { ListingWithDetails } from "../queries/get-listings";

interface FarmerProfileViewProps {
  farmer: User;
  listings: ListingWithDetails[];
}

export function FarmerProfileView({
  farmer,
  listings,
}: FarmerProfileViewProps) {
  const t = useTranslations("farmer");
  const tMarketplace = useTranslations("marketplace");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{farmer.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {farmer.voivodeship && (
            <p className="text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {farmer.voivodeship}
              {farmer.commune ? `, ${farmer.commune}` : ""}
            </p>
          )}
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t("memberSince")}{" "}
            {new Date(farmer.createdAt).toLocaleDateString("pl-PL", {
              year: "numeric",
              month: "long",
            })}
          </p>
          <Badge variant="secondary">
            {farmer.role === "FARMER"
              ? "Rolnik"
              : farmer.role === "BOTH"
                ? "Rolnik i konsument"
                : "Konsument"}
          </Badge>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-bold mb-4">
          {t("listings")} ({listings.length})
        </h2>
        {listings.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {t("noListings")}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.map((item) => (
              <ListingCard key={item.listing.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create farmer profile page**

```bash
mkdir -p src/app/\[locale\]/\(main\)/farmers/\[id\]
```

Create `src/app/[locale]/(main)/farmers/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  listings,
  products,
  users,
  categories,
} from "@/shared/db/schema";
import { FarmerProfileView } from "@/domains/marketplace/components/farmer-profile-view";

export default async function FarmerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const farmer = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!farmer || (farmer.role !== "FARMER" && farmer.role !== "BOTH")) {
    notFound();
  }

  const farmerListings = await db
    .select({
      listing: listings,
      product: products,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        voivodeship: users.voivodeship,
      },
      category: {
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      },
    })
    .from(listings)
    .innerJoin(products, eq(listings.productId, products.id))
    .innerJoin(users, eq(products.farmerId, users.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.farmerId, id));

  return (
    <div className="max-w-5xl mx-auto p-4">
      <FarmerProfileView farmer={farmer} listings={farmerListings} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/marketplace/components/farmer-profile-view.tsx src/app/\[locale\]/\(main\)/farmers/
git commit -m "feat: add farmer profile page with their listings"
```

---

## Task 13: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (passwords: 3, validation: 10, register: 3, login: 3, update-profile: 3, create-listing-schema: 12, create-listing: 4, delete-listing: 4 = ~31 tests total).

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: No lint errors.

- [ ] **Step 4: Fix any issues found in steps 1-3**

If any test, type, or lint errors: fix them before proceeding.

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds with marketplace routes visible:
```
├ ƒ /[locale]/marketplace
├ ƒ /[locale]/marketplace/create
├ ƒ /[locale]/marketplace/[id]
├ ƒ /[locale]/farmers/[id]
```

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type and lint issues from marketplace verification"
```

Only if there were fixes needed. Skip if everything passed clean.

---

## Summary

Phase 2 delivers:
- Product categories (10 root categories, seeded)
- Products + listings database schema with Drizzle relations
- Create and delete listing server actions with role/ownership checks
- Marketplace browse page with search, category/voivodeship/method/price filters, sort, pagination
- Create listing form with delivery options (pickup, delivery, drop point)
- Product detail page with full product info, delivery options, farmer card, owner delete
- Farmer profile page with all their listings
- Polish translations for all marketplace UI
- ~31 unit tests covering validation schemas and server actions

Next: Phase 3 (Social) — feed, posts, groups, events.
