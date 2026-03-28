# Phase 7: Logistics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pickup points, group buying coordination with status flow, and delivery management to complete the logistics domain.

**Architecture:** New `logistics` domain with pickup points (predefined locations for DROP_POINT delivery), group buying collections (status-driven coordination within buying groups), and collection participants. The `DeliveryOption` type already exists in listings schema — we build UI to manage it and connect pickup points. Collections follow a status flow: COLLECTING → ORDERED → IN_DELIVERY → RECEIVED.

**Tech Stack:** Drizzle ORM, Zod, Next.js Server Actions, next-intl, shadcn/ui, Leaflet (pickup point map)

---

## File Structure

```
src/shared/db/schema/
  pickup-points.ts       — PickupPoint table
  collections.ts         — GroupBuyingCollection table
  collection-items.ts    — CollectionItem (participant entries)
  relations.ts           — Add new relations
  index.ts               — Export new tables

src/domains/logistics/
  schemas/validation.ts  — Zod schemas for all logistics inputs
  actions/
    create-pickup-point.ts
    create-collection.ts
    join-collection.ts
    update-collection-status.ts
  queries/
    get-pickup-points.ts
    get-collections.ts
    get-collection.ts
  components/
    pickup-point-card.tsx
    pickup-point-form.tsx
    collection-card.tsx
    collection-detail.tsx
    collection-form.tsx
    collection-join-button.tsx
    delivery-options-display.tsx
  index.ts

src/app/[locale]/(main)/
  social/groups/[id]/
    collections/page.tsx         — Group's collections list
    collections/create/page.tsx  — Create collection
    collections/[collectionId]/page.tsx — Collection detail

messages/pl.json — logistics section

tests/domains/logistics/ — validation, actions
```

---

### Task 1: Schema — Pickup Points

**Files:**
- Create: `src/shared/db/schema/pickup-points.ts`

- [ ] **Step 1: Create pickup points schema**

```typescript
// src/shared/db/schema/pickup-points.ts
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const pickupPoints = pgTable("pickup_points", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  address: varchar("address", { length: 300 }).notNull(),
  latitude: text("latitude"),
  longitude: text("longitude"),
  hours: varchar("hours", { length: 200 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PickupPoint = typeof pickupPoints.$inferSelect;
export type NewPickupPoint = typeof pickupPoints.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/db/schema/pickup-points.ts
git commit -m "feat: add pickup_points table schema"
```

---

### Task 2: Schema — Collections + Collection Items

**Files:**
- Create: `src/shared/db/schema/collections.ts`
- Create: `src/shared/db/schema/collection-items.ts`

- [ ] **Step 1: Create collections schema**

```typescript
// src/shared/db/schema/collections.ts
import {
  pgTable,
  text,
  varchar,
  timestamp,
  numeric,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { groups } from "./groups";
import { listings } from "./listings";

export const collectionStatusEnum = pgEnum("collection_status", [
  "COLLECTING",
  "ORDERED",
  "IN_DELIVERY",
  "RECEIVED",
  "CANCELLED",
]);

export const collections = pgTable("collections", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  coordinatorId: text("coordinator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  status: collectionStatusEnum("status").notNull().default("COLLECTING"),
  targetAmount: numeric("target_amount", { precision: 10, scale: 2 }),
  pickupAddress: varchar("pickup_address", { length: 300 }),
  pickupDate: timestamp("pickup_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
```

- [ ] **Step 2: Create collection items schema**

```typescript
// src/shared/db/schema/collection-items.ts
import {
  pgTable,
  text,
  timestamp,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { collections } from "./collections";

export const collectionItems = pgTable(
  "collection_items",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
    note: text("note"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.userId] }),
  ]
);

export type CollectionItem = typeof collectionItems.$inferSelect;
export type NewCollectionItem = typeof collectionItems.$inferInsert;
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/db/schema/collections.ts src/shared/db/schema/collection-items.ts
git commit -m "feat: add collections and collection_items table schemas"
```

---

### Task 3: Update Relations + Barrel Export + Push Schema

**Files:**
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Add relations**

Add imports at top of `relations.ts`:
```typescript
import { pickupPoints } from "./pickup-points";
import { collections } from "./collections";
import { collectionItems } from "./collection-items";
```

Add at bottom of `relations.ts`:
```typescript
export const pickupPointsRelations = relations(pickupPoints, ({ one }) => ({
  creator: one(users, {
    fields: [pickupPoints.createdBy],
    references: [users.id],
  }),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  group: one(groups, {
    fields: [collections.groupId],
    references: [groups.id],
  }),
  listing: one(listings, {
    fields: [collections.listingId],
    references: [listings.id],
  }),
  coordinator: one(users, {
    fields: [collections.coordinatorId],
    references: [users.id],
  }),
  items: many(collectionItems),
}));

export const collectionItemsRelations = relations(collectionItems, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionItems.collectionId],
    references: [collections.id],
  }),
  user: one(users, {
    fields: [collectionItems.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 2: Update barrel export in `index.ts`**

Add table exports:
```typescript
export {
  pickupPoints,
  type PickupPoint,
  type NewPickupPoint,
} from "./pickup-points";
export {
  collections,
  collectionStatusEnum,
  type Collection,
  type NewCollection,
} from "./collections";
export {
  collectionItems,
  type CollectionItem,
  type NewCollectionItem,
} from "./collection-items";
```

Add to relations export:
```typescript
  pickupPointsRelations,
  collectionsRelations,
  collectionItemsRelations,
```

- [ ] **Step 3: Push schema**

```bash
npx drizzle-kit push
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/relations.ts src/shared/db/schema/index.ts
git commit -m "feat: add logistics relations, update barrel export, push schema"
```

---

### Task 4: Validation Schemas + Tests

**Files:**
- Create: `src/domains/logistics/schemas/validation.ts`
- Create: `tests/domains/logistics/schemas/validation.test.ts`

- [ ] **Step 1: Write validation tests**

```typescript
// tests/domains/logistics/schemas/validation.test.ts
import { describe, it, expect } from "vitest";
import {
  createPickupPointSchema,
  createCollectionSchema,
  joinCollectionSchema,
  updateCollectionStatusSchema,
} from "@/domains/logistics/schemas/validation";

describe("createPickupPointSchema", () => {
  const valid = {
    name: "Parking przy sklepie",
    address: "ul. Dluga 15, Krakow",
  };

  it("accepts valid input", () => {
    expect(createPickupPointSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(
      createPickupPointSchema.safeParse({ ...valid, name: "" }).success
    ).toBe(false);
  });

  it("rejects empty address", () => {
    expect(
      createPickupPointSchema.safeParse({ ...valid, address: "" }).success
    ).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createPickupPointSchema.safeParse({
      ...valid,
      description: "Przy wejsciu",
      hours: "Pn-Pt 8:00-18:00",
      latitude: "50.06",
      longitude: "19.94",
    });
    expect(result.success).toBe(true);
  });
});

describe("createCollectionSchema", () => {
  const valid = {
    groupId: "group-1",
    listingId: "listing-1",
    title: "Zbiorka na pomidory",
  };

  it("accepts valid input", () => {
    expect(createCollectionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(
      createCollectionSchema.safeParse({ ...valid, title: "" }).success
    ).toBe(false);
  });

  it("accepts optional targetAmount", () => {
    const result = createCollectionSchema.safeParse({
      ...valid,
      targetAmount: "50.00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional pickupAddress and pickupDate", () => {
    const result = createCollectionSchema.safeParse({
      ...valid,
      pickupAddress: "ul. Dluga 15",
      pickupDate: "2026-04-15T10:00:00Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("joinCollectionSchema", () => {
  it("accepts valid input", () => {
    const result = joinCollectionSchema.safeParse({
      collectionId: "col-1",
      quantity: "5.00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty quantity", () => {
    const result = joinCollectionSchema.safeParse({
      collectionId: "col-1",
      quantity: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCollectionStatusSchema", () => {
  it("accepts valid status transition", () => {
    const result = updateCollectionStatusSchema.safeParse({
      collectionId: "col-1",
      status: "ORDERED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = updateCollectionStatusSchema.safeParse({
      collectionId: "col-1",
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Create validation schemas**

```typescript
// src/domains/logistics/schemas/validation.ts
import { z } from "zod";

export const createPickupPointSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(200),
  description: z.string().max(2000).default(""),
  address: z.string().min(1, "Adres jest wymagany").max(300),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  hours: z.string().max(200).optional(),
});

export type CreatePickupPointInput = z.input<typeof createPickupPointSchema>;

export const createCollectionSchema = z.object({
  groupId: z.string().min(1),
  listingId: z.string().min(1),
  title: z.string().min(1, "Tytul jest wymagany").max(200),
  description: z.string().max(2000).default(""),
  targetAmount: z.string().optional(),
  pickupAddress: z.string().max(300).optional(),
  pickupDate: z.string().optional(),
});

export type CreateCollectionInput = z.input<typeof createCollectionSchema>;

export const joinCollectionSchema = z.object({
  collectionId: z.string().min(1),
  quantity: z.string().min(1, "Ilosc jest wymagana"),
  note: z.string().max(500).optional(),
});

export type JoinCollectionInput = z.infer<typeof joinCollectionSchema>;

export const updateCollectionStatusSchema = z.object({
  collectionId: z.string().min(1),
  status: z.enum(["COLLECTING", "ORDERED", "IN_DELIVERY", "RECEIVED", "CANCELLED"]),
});

export type UpdateCollectionStatusInput = z.infer<typeof updateCollectionStatusSchema>;
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/domains/logistics/schemas/validation.test.ts
```
Expected: PASS (11 tests)

- [ ] **Step 4: Commit**

```bash
git add src/domains/logistics/schemas/validation.ts tests/domains/logistics/schemas/validation.test.ts
git commit -m "feat: add logistics validation schemas with tests"
```

---

### Task 5: i18n — Logistics Translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add logistics section after "reputation"**

```json
  "logistics": {
    "pickupPoints": "Punkty odbioru",
    "createPickupPoint": "Dodaj punkt odbioru",
    "pointName": "Nazwa punktu",
    "pointDescription": "Opis",
    "pointAddress": "Adres",
    "pointHours": "Godziny otwarcia",
    "noPickupPoints": "Brak punktow odbioru",
    "active": "Aktywny",
    "inactive": "Nieaktywny",
    "collections": "Zbiorki",
    "createCollection": "Utworz zbiorke",
    "collectionTitle": "Tytul zbiorki",
    "collectionDescription": "Opis",
    "targetAmount": "Cel (ilosc)",
    "currentAmount": "Zebrano",
    "pickupAddress": "Adres odbioru",
    "pickupDate": "Data odbioru",
    "joinCollection": "Dolacz do zbiorki",
    "leaveCollection": "Opusc zbiorke",
    "quantity": "Ilosc",
    "note": "Notatka",
    "participants": "Uczestnicy",
    "coordinator": "Koordynator",
    "statusCollecting": "Zbieranie",
    "statusOrdered": "Zamowione",
    "statusInDelivery": "W dostawie",
    "statusReceived": "Odebrane",
    "statusCancelled": "Anulowane",
    "updateStatus": "Zmien status",
    "noCollections": "Brak zbiorek w tej grupie",
    "collectionCreated": "Zbiorka utworzona",
    "joined": "Dolaczono do zbiorki",
    "deliveryPickup": "Odbior osobisty",
    "deliveryDelivery": "Dostawa",
    "deliveryDropPoint": "Punkt odbioru",
    "deliveryRadius": "Promien dostawy",
    "deliveryMinAmount": "Min. zamowienie",
    "deliveryCost": "Koszt dostawy",
    "deliveryHours": "Godziny odbioru",
    "noDeliveryOptions": "Brak opcji dostawy",
    "progress": "Postep"
  }
```

- [ ] **Step 2: Commit**

```bash
git add messages/pl.json
git commit -m "feat: add logistics i18n translations"
```

---

### Task 6: Server Actions — Pickup Points + Tests

**Files:**
- Create: `src/domains/logistics/actions/create-pickup-point.ts`
- Create: `tests/domains/logistics/actions/create-pickup-point.test.ts`

- [ ] **Step 1: Write tests**

```typescript
// tests/domains/logistics/actions/create-pickup-point.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPickupPoint } from "@/domains/logistics/actions/create-pickup-point";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
  };
  return { db: mockDb };
});

describe("createPickupPoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createPickupPoint({
      name: "Parking",
      address: "ul. Dluga 15",
    });

    expect(result.success).toBe(false);
  });

  it("returns error for empty name", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const result = await createPickupPoint({
      name: "",
      address: "ul. Dluga 15",
    });

    expect(result.success).toBe(false);
  });

  it("creates pickup point on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "pp-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await createPickupPoint({
      name: "Parking przy sklepie",
      address: "ul. Dluga 15, Krakow",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pointId).toBe("pp-1");
    }
  });
});
```

- [ ] **Step 2: Create server action**

```typescript
// src/domains/logistics/actions/create-pickup-point.ts
"use server";

import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { pickupPoints } from "@/shared/db/schema";
import {
  createPickupPointSchema,
  type CreatePickupPointInput,
} from "../schemas/validation";

type CreatePickupPointResult =
  | { success: true; pointId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createPickupPoint(
  input: CreatePickupPointInput
): Promise<CreatePickupPointResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createPickupPointSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const [point] = await db
    .insert(pickupPoints)
    .values({
      createdBy: session.user.id,
      ...parsed.data,
    })
    .returning({ id: pickupPoints.id });

  return { success: true, pointId: point.id };
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/domains/logistics/actions/create-pickup-point.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add src/domains/logistics/actions/create-pickup-point.ts tests/domains/logistics/actions/create-pickup-point.test.ts
git commit -m "feat: add createPickupPoint server action with tests"
```

---

### Task 7: Server Actions — Collections + Tests

**Files:**
- Create: `src/domains/logistics/actions/create-collection.ts`
- Create: `src/domains/logistics/actions/join-collection.ts`
- Create: `src/domains/logistics/actions/update-collection-status.ts`
- Create: `tests/domains/logistics/actions/create-collection.test.ts`
- Create: `tests/domains/logistics/actions/join-collection.test.ts`

- [ ] **Step 1: Write create-collection tests**

```typescript
// tests/domains/logistics/actions/create-collection.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCollection } from "@/domains/logistics/actions/create-collection";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    query: {
      groupMembers: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("createCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createCollection({
      groupId: "group-1",
      listingId: "listing-1",
      title: "Zbiorka",
    });

    expect(result.success).toBe(false);
  });

  it("returns error when not a group member", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.groupMembers.findFirst).mockResolvedValueOnce(undefined);

    const result = await createCollection({
      groupId: "group-1",
      listingId: "listing-1",
      title: "Zbiorka",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes czlonkiem tej grupy");
    }
  });

  it("creates collection on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.groupMembers.findFirst).mockResolvedValueOnce({
      groupId: "group-1",
      userId: "user-1",
      role: "MEMBER",
      joinedAt: new Date(),
    });

    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "col-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await createCollection({
      groupId: "group-1",
      listingId: "listing-1",
      title: "Zbiorka na pomidory",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.collectionId).toBe("col-1");
    }
  });
});
```

- [ ] **Step 2: Write join-collection tests**

```typescript
// tests/domains/logistics/actions/join-collection.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { joinCollection } from "@/domains/logistics/actions/join-collection";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn(),
    }),
    query: {
      collections: { findFirst: vi.fn() },
      collectionItems: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("joinCollection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await joinCollection({
      collectionId: "col-1",
      quantity: "5",
    });

    expect(result.success).toBe(false);
  });

  it("returns error when collection not found", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.collections.findFirst).mockResolvedValueOnce(undefined);

    const result = await joinCollection({
      collectionId: "col-1",
      quantity: "5",
    });

    expect(result.success).toBe(false);
  });

  it("returns error when collection is not collecting", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.collections.findFirst).mockResolvedValueOnce({
      id: "col-1",
      status: "ORDERED",
      groupId: "group-1",
      listingId: "listing-1",
      coordinatorId: "user-2",
      title: "Zbiorka",
      description: "",
      targetAmount: null,
      pickupAddress: null,
      pickupDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await joinCollection({
      collectionId: "col-1",
      quantity: "5",
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Create server actions**

```typescript
// src/domains/logistics/actions/create-collection.ts
"use server";

import { eq, and } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { collections, groupMembers } from "@/shared/db/schema";
import {
  createCollectionSchema,
  type CreateCollectionInput,
} from "../schemas/validation";

type CreateCollectionResult =
  | { success: true; collectionId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createCollection(
  input: CreateCollectionInput
): Promise<CreateCollectionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, parsed.data.groupId),
      eq(groupMembers.userId, session.user.id)
    ),
  });

  if (!membership) {
    return { success: false, error: "Nie jestes czlonkiem tej grupy" };
  }

  const [collection] = await db
    .insert(collections)
    .values({
      groupId: parsed.data.groupId,
      listingId: parsed.data.listingId,
      coordinatorId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      targetAmount: parsed.data.targetAmount,
      pickupAddress: parsed.data.pickupAddress,
      pickupDate: parsed.data.pickupDate
        ? new Date(parsed.data.pickupDate)
        : undefined,
    })
    .returning({ id: collections.id });

  return { success: true, collectionId: collection.id };
}
```

```typescript
// src/domains/logistics/actions/join-collection.ts
"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { collectionItems, collections } from "@/shared/db/schema";
import {
  joinCollectionSchema,
  type JoinCollectionInput,
} from "../schemas/validation";

type JoinCollectionResult =
  | { success: true }
  | { success: false; error: string };

export async function joinCollection(
  input: JoinCollectionInput
): Promise<JoinCollectionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = joinCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane" };
  }

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, parsed.data.collectionId),
  });

  if (!collection) {
    return { success: false, error: "Zbiorka nie istnieje" };
  }

  if (collection.status !== "COLLECTING") {
    return { success: false, error: "Zbiorka nie przyjmuje juz uczestnikow" };
  }

  const existing = await db.query.collectionItems.findFirst({
    where: eq(collectionItems.collectionId, parsed.data.collectionId),
  });

  if (existing) {
    return { success: false, error: "Juz dolaczyles do tej zbiorki" };
  }

  await db.insert(collectionItems).values({
    collectionId: parsed.data.collectionId,
    userId: session.user.id,
    quantity: parsed.data.quantity,
    note: parsed.data.note,
  });

  return { success: true };
}
```

```typescript
// src/domains/logistics/actions/update-collection-status.ts
"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { collections } from "@/shared/db/schema";
import {
  updateCollectionStatusSchema,
  type UpdateCollectionStatusInput,
} from "../schemas/validation";

type UpdateStatusResult =
  | { success: true; status: string }
  | { success: false; error: string };

export async function updateCollectionStatus(
  input: UpdateCollectionStatusInput
): Promise<UpdateStatusResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = updateCollectionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane" };
  }

  const collection = await db.query.collections.findFirst({
    where: eq(collections.id, parsed.data.collectionId),
  });

  if (!collection) {
    return { success: false, error: "Zbiorka nie istnieje" };
  }

  if (collection.coordinatorId !== session.user.id) {
    return { success: false, error: "Tylko koordynator moze zmienic status" };
  }

  await db
    .update(collections)
    .set({ status: parsed.data.status })
    .where(eq(collections.id, parsed.data.collectionId));

  return { success: true, status: parsed.data.status };
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run tests/domains/logistics/actions
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domains/logistics/actions/create-collection.ts src/domains/logistics/actions/join-collection.ts src/domains/logistics/actions/update-collection-status.ts tests/domains/logistics/actions/create-collection.test.ts tests/domains/logistics/actions/join-collection.test.ts
git commit -m "feat: add collection server actions — create, join, update status with tests"
```

---

### Task 8: Queries

**Files:**
- Create: `src/domains/logistics/queries/get-pickup-points.ts`
- Create: `src/domains/logistics/queries/get-collections.ts`
- Create: `src/domains/logistics/queries/get-collection.ts`

- [ ] **Step 1: Create pickup points query**

```typescript
// src/domains/logistics/queries/get-pickup-points.ts
import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { pickupPoints, users } from "@/shared/db/schema";

export async function getPickupPoints(options?: { creatorId?: string }) {
  const conditions = [];

  if (options?.creatorId) {
    conditions.push(eq(pickupPoints.createdBy, options.creatorId));
  }

  conditions.push(eq(pickupPoints.isActive, true));

  return db
    .select({
      id: pickupPoints.id,
      name: pickupPoints.name,
      description: pickupPoints.description,
      address: pickupPoints.address,
      latitude: pickupPoints.latitude,
      longitude: pickupPoints.longitude,
      hours: pickupPoints.hours,
      isActive: pickupPoints.isActive,
      createdAt: pickupPoints.createdAt,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(pickupPoints)
    .innerJoin(users, eq(pickupPoints.createdBy, users.id))
    .where(conditions.length === 1 ? conditions[0] : undefined)
    .orderBy(desc(pickupPoints.createdAt));
}

export type PickupPointWithCreator = Awaited<
  ReturnType<typeof getPickupPoints>
>[number];
```

- [ ] **Step 2: Create collections query**

```typescript
// src/domains/logistics/queries/get-collections.ts
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  collections,
  collectionItems,
  users,
  listings,
  products,
} from "@/shared/db/schema";

export async function getCollectionsByGroup(groupId: string) {
  const allCollections = await db
    .select({
      id: collections.id,
      title: collections.title,
      description: collections.description,
      status: collections.status,
      targetAmount: collections.targetAmount,
      pickupAddress: collections.pickupAddress,
      pickupDate: collections.pickupDate,
      createdAt: collections.createdAt,
      coordinator: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      listing: {
        id: listings.id,
        price: listings.price,
        unit: listings.unit,
      },
      productName: products.name,
    })
    .from(collections)
    .innerJoin(users, eq(collections.coordinatorId, users.id))
    .innerJoin(listings, eq(collections.listingId, listings.id))
    .innerJoin(products, eq(listings.productId, products.id))
    .where(eq(collections.groupId, groupId))
    .orderBy(desc(collections.createdAt));

  const enriched = await Promise.all(
    allCollections.map(async (col) => {
      const [{ count, totalQty }] = await db
        .select({
          count: sql<number>`cast(count(*) as int)`,
          totalQty: sql<string>`coalesce(sum(cast(${collectionItems.quantity} as numeric)), 0)`,
        })
        .from(collectionItems)
        .where(eq(collectionItems.collectionId, col.id));

      return {
        ...col,
        participantCount: count,
        totalQuantity: totalQty,
      };
    })
  );

  return enriched;
}

export type CollectionWithDetails = Awaited<
  ReturnType<typeof getCollectionsByGroup>
>[number];
```

- [ ] **Step 3: Create single collection query**

```typescript
// src/domains/logistics/queries/get-collection.ts
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  collections,
  collectionItems,
  users,
  listings,
  products,
} from "@/shared/db/schema";

export async function getCollection(collectionId: string) {
  const [collection] = await db
    .select({
      id: collections.id,
      title: collections.title,
      description: collections.description,
      status: collections.status,
      targetAmount: collections.targetAmount,
      pickupAddress: collections.pickupAddress,
      pickupDate: collections.pickupDate,
      groupId: collections.groupId,
      createdAt: collections.createdAt,
      coordinator: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      listing: {
        id: listings.id,
        price: listings.price,
        unit: listings.unit,
      },
      productName: products.name,
    })
    .from(collections)
    .innerJoin(users, eq(collections.coordinatorId, users.id))
    .innerJoin(listings, eq(collections.listingId, listings.id))
    .innerJoin(products, eq(listings.productId, products.id))
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) return null;

  const items = await db
    .select({
      userId: collectionItems.userId,
      quantity: collectionItems.quantity,
      note: collectionItems.note,
      joinedAt: collectionItems.joinedAt,
      user: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(collectionItems)
    .innerJoin(users, eq(collectionItems.userId, users.id))
    .where(eq(collectionItems.collectionId, collectionId));

  return { ...collection, items };
}

export type CollectionDetail = NonNullable<
  Awaited<ReturnType<typeof getCollection>>
>;
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/logistics/queries/get-pickup-points.ts src/domains/logistics/queries/get-collections.ts src/domains/logistics/queries/get-collection.ts
git commit -m "feat: add logistics queries — pickup points, collections list and detail"
```

---

### Task 9: UI Components — Pickup Points + Delivery Display

**Files:**
- Create: `src/domains/logistics/components/pickup-point-card.tsx`
- Create: `src/domains/logistics/components/pickup-point-form.tsx`
- Create: `src/domains/logistics/components/delivery-options-display.tsx`

- [ ] **Step 1: Create components**

(pickup-point-card.tsx, pickup-point-form.tsx, delivery-options-display.tsx — server/client components following existing patterns with next-intl, shadcn Card/Badge/Input/Select, useTransition for form submission)

- [ ] **Step 2: Commit**

```bash
git add src/domains/logistics/components/pickup-point-card.tsx src/domains/logistics/components/pickup-point-form.tsx src/domains/logistics/components/delivery-options-display.tsx
git commit -m "feat: add pickup point and delivery display components"
```

---

### Task 10: UI Components — Collections

**Files:**
- Create: `src/domains/logistics/components/collection-card.tsx`
- Create: `src/domains/logistics/components/collection-form.tsx`
- Create: `src/domains/logistics/components/collection-detail.tsx`
- Create: `src/domains/logistics/components/collection-join-button.tsx`

- [ ] **Step 1: Create components**

(collection-card.tsx with status badge + progress bar, collection-form.tsx as client component, collection-detail.tsx with participant list, collection-join-button.tsx as client component with quantity input)

- [ ] **Step 2: Commit**

```bash
git add src/domains/logistics/components/collection-card.tsx src/domains/logistics/components/collection-form.tsx src/domains/logistics/components/collection-detail.tsx src/domains/logistics/components/collection-join-button.tsx
git commit -m "feat: add collection UI components — card, form, detail, join button"
```

---

### Task 11: Barrel Export

**Files:**
- Create: `src/domains/logistics/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// src/domains/logistics/index.ts
export {
  createPickupPointSchema,
  createCollectionSchema,
  joinCollectionSchema,
  updateCollectionStatusSchema,
  type CreatePickupPointInput,
  type CreateCollectionInput,
  type JoinCollectionInput,
  type UpdateCollectionStatusInput,
} from "./schemas/validation";
export { createPickupPoint } from "./actions/create-pickup-point";
export { createCollection } from "./actions/create-collection";
export { joinCollection } from "./actions/join-collection";
export { updateCollectionStatus } from "./actions/update-collection-status";
export {
  getPickupPoints,
  type PickupPointWithCreator,
} from "./queries/get-pickup-points";
export {
  getCollectionsByGroup,
  type CollectionWithDetails,
} from "./queries/get-collections";
export {
  getCollection,
  type CollectionDetail,
} from "./queries/get-collection";
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/logistics/index.ts
git commit -m "feat: add logistics barrel export"
```

---

### Task 12: Pages — Collections in Groups

**Files:**
- Create: `src/app/[locale]/(main)/social/groups/[id]/collections/page.tsx`
- Create: `src/app/[locale]/(main)/social/groups/[id]/collections/create/page.tsx`
- Create: `src/app/[locale]/(main)/social/groups/[id]/collections/[collectionId]/page.tsx`

- [ ] **Step 1: Create collection list page**

(Server component: auth check, getCollectionsByGroup, render CollectionCard list with create button)

- [ ] **Step 2: Create collection create page**

(Server component with auth + group membership check, renders CollectionForm)

- [ ] **Step 3: Create collection detail page**

(Server component: getCollection, render CollectionDetail with join button and status controls for coordinator)

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(main)/social/groups/[id]/collections/page.tsx" "src/app/[locale]/(main)/social/groups/[id]/collections/create/page.tsx" "src/app/[locale]/(main)/social/groups/[id]/collections/[collectionId]/page.tsx"
git commit -m "feat: add collection pages — list, create, detail within groups"
```

---

### Task 13: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass (~135+)

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Build**

```bash
npx next build
```
Expected: New routes visible

- [ ] **Step 4: Push**

```bash
git push
```
