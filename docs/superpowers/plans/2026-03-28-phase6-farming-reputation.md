# Phase 6: Farming + Reputation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add blockchain-ready crop logging and review/reputation systems using the repository pattern, with immutable entries chained by SHA-256 hashes.

**Architecture:** Two new domains (`farming`, `reputation`) each using the repository pattern — a TypeScript interface separates business logic from storage. Today `PostgresCropLogRepository` and `PostgresReviewRepository` implement the interface with Drizzle. Every CropLog and Review entry is immutable (no edits) and includes `contentHash` + `previousHash` forming a hash chain per farmer/reviewer. Server Actions go through the repository, never directly to DB.

**Tech Stack:** Drizzle ORM, Zod, Next.js Server Actions, Web Crypto API (SHA-256), next-intl, shadcn/ui

---

## File Structure

```
src/shared/db/schema/
  crop-logs.ts          — CropLog table + enum
  reviews.ts            — Review table
  relations.ts          — Add cropLog + review relations
  index.ts              — Export new tables

src/domains/farming/
  types.ts              — CropLogEntry type, CropLogRepository interface
  repository/
    postgres.ts         — PostgresCropLogRepository implementation
  schemas/validation.ts — createCropLogSchema
  actions/
    create-crop-log.ts  — Server Action
  queries/
    get-crop-logs.ts    — By farmer, by product
  components/
    crop-log-card.tsx   — Single log entry display
    crop-log-form.tsx   — Create new entry
    crop-log-list.tsx   — List of entries with hash chain indicator
  index.ts              — Barrel export

src/domains/reputation/
  types.ts              — ReviewEntry type, ReviewRepository interface
  repository/
    postgres.ts         — PostgresReviewRepository implementation
  schemas/validation.ts — createReviewSchema
  actions/
    create-review.ts    — Server Action
  queries/
    get-reviews.ts      — By target user, by reviewer
    get-reputation.ts   — Aggregate stats for a user
  components/
    review-card.tsx     — Single review display
    review-form.tsx     — Create new review
    reputation-badge.tsx — Stars + stats summary
  index.ts              — Barrel export

src/app/[locale]/(main)/
  farmers/[id]/
    crop-log/page.tsx   — Farmer's crop log page
  social/users/[id]/
    reviews/page.tsx    — User's reviews page

messages/pl.json        — farming + reputation sections

tests/domains/farming/  — validation, actions, repository
tests/domains/reputation/ — validation, actions, repository
```

---

### Task 1: Schema — Crop Logs Table

**Files:**
- Create: `src/shared/db/schema/crop-logs.ts`

- [ ] **Step 1: Create crop logs schema**

```typescript
// src/shared/db/schema/crop-logs.ts
import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { products } from "./products";

export const cropLogTypeEnum = pgEnum("crop_log_type", [
  "PLANTING",
  "GROWING",
  "TREATMENT",
  "HARVEST",
  "OTHER",
]);

export const cropLogs = pgTable("crop_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  farmerId: text("farmer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  type: cropLogTypeEnum("type").notNull(),
  description: text("description").notNull(),
  images: text("images").array().notNull().default([]),
  data: jsonb("data").$type<{
    crop?: string;
    area?: string;
    quantity?: string;
    method?: string;
  }>(),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  previousHash: varchar("previous_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CropLog = typeof cropLogs.$inferSelect;
export type NewCropLog = typeof cropLogs.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/db/schema/crop-logs.ts
git commit -m "feat: add crop_logs table schema with hash chain fields"
```

---

### Task 2: Schema — Reviews Table

**Files:**
- Create: `src/shared/db/schema/reviews.ts`

- [ ] **Step 1: Create reviews schema**

```typescript
// src/shared/db/schema/reviews.ts
import {
  pgTable,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { products } from "./products";

export const reviews = pgTable("reviews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetId: text("target_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  overall: integer("overall").notNull(),
  dimensions: jsonb("dimensions").$type<{
    quality?: number;
    communication?: number;
    punctuality?: number;
    accuracy?: number;
  }>(),
  comment: text("comment"),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  previousHash: varchar("previous_hash", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/db/schema/reviews.ts
git commit -m "feat: add reviews table schema with hash chain fields"
```

---

### Task 3: Update Relations + Barrel Export + Push Schema

**Files:**
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Add relations for cropLogs and reviews**

Add imports at top of `relations.ts`:
```typescript
import { cropLogs } from "./crop-logs";
import { reviews } from "./reviews";
```

Add at bottom of `relations.ts`:
```typescript
export const cropLogsRelations = relations(cropLogs, ({ one }) => ({
  farmer: one(users, {
    fields: [cropLogs.farmerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [cropLogs.productId],
    references: [products.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  target: one(users, {
    fields: [reviews.targetId],
    references: [users.id],
    relationName: "reviewTarget",
  }),
  product: one(products, {
    fields: [reviews.productId],
    references: [products.id],
  }),
}));
```

- [ ] **Step 2: Update barrel export in `index.ts`**

Add to `index.ts`:
```typescript
export {
  cropLogs,
  cropLogTypeEnum,
  type CropLog,
  type NewCropLog,
} from "./crop-logs";
export {
  reviews,
  type Review,
  type NewReview,
} from "./reviews";
```

Add to relations export:
```typescript
  cropLogsRelations,
  reviewsRelations,
```

- [ ] **Step 3: Push schema to Neon**

```bash
npx drizzle-kit push
```

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/relations.ts src/shared/db/schema/index.ts src/shared/db/schema/crop-logs.ts src/shared/db/schema/reviews.ts
git commit -m "feat: add crop_logs and reviews relations, update barrel export, push schema"
```

---

### Task 4: Farming Domain — Types + Repository Interface

**Files:**
- Create: `src/domains/farming/types.ts`

- [ ] **Step 1: Define types and repository interface**

```typescript
// src/domains/farming/types.ts

export interface CropLogEntry {
  farmerId: string;
  productId?: string;
  type: "PLANTING" | "GROWING" | "TREATMENT" | "HARVEST" | "OTHER";
  description: string;
  images: string[];
  data?: {
    crop?: string;
    area?: string;
    quantity?: string;
    method?: string;
  };
}

export interface CropLogRecord extends CropLogEntry {
  id: string;
  contentHash: string;
  previousHash: string | null;
  createdAt: Date;
}

export interface CropLogRepository {
  create(entry: CropLogEntry): Promise<CropLogRecord>;
  getByFarmer(farmerId: string): Promise<CropLogRecord[]>;
  getByProduct(productId: string): Promise<CropLogRecord[]>;
  verify(entryId: string): Promise<boolean>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/farming/types.ts
git commit -m "feat: add CropLogRepository interface and types"
```

---

### Task 5: Farming Domain — PostgresCropLogRepository

**Files:**
- Create: `src/domains/farming/repository/postgres.ts`
- Create: `tests/domains/farming/repository/postgres.test.ts`

- [ ] **Step 1: Write tests for repository**

```typescript
// tests/domains/farming/repository/postgres.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the hash computation and verify logic in isolation
// by mocking the db layer

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn(),
          }),
        }),
        orderBy: vi.fn(),
      }),
    }),
  };
  return { db: mockDb };
});

// Test the hash utility directly
describe("computeContentHash", () => {
  it("produces consistent SHA-256 hex string", async () => {
    const { computeCropLogHash } = await import(
      "@/domains/farming/repository/postgres"
    );

    const hash = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different inputs", async () => {
    const { computeCropLogHash } = await import(
      "@/domains/farming/repository/postgres"
    );

    const hash1 = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    const hash2 = await computeCropLogHash({
      description: "Posadzono ogorki",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hash1).not.toBe(hash2);
  });

  it("includes images in hash computation", async () => {
    const { computeCropLogHash } = await import(
      "@/domains/farming/repository/postgres"
    );

    const hashWithout = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: [],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    const hashWith = await computeCropLogHash({
      description: "Posadzono pomidory",
      images: ["img1.jpg"],
      farmerId: "farmer-1",
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hashWithout).not.toBe(hashWith);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/farming/repository/postgres.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement PostgresCropLogRepository**

```typescript
// src/domains/farming/repository/postgres.ts
import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { cropLogs } from "@/shared/db/schema";
import type {
  CropLogEntry,
  CropLogRecord,
  CropLogRepository,
} from "../types";

export async function computeCropLogHash(input: {
  description: string;
  images: string[];
  farmerId: string;
  timestamp: string;
}): Promise<string> {
  const payload = JSON.stringify({
    description: input.description,
    images: input.images.sort(),
    farmerId: input.farmerId,
    timestamp: input.timestamp,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class PostgresCropLogRepository implements CropLogRepository {
  async create(entry: CropLogEntry): Promise<CropLogRecord> {
    // Get previous hash for this farmer's chain
    const [lastEntry] = await db
      .select({ contentHash: cropLogs.contentHash })
      .from(cropLogs)
      .where(eq(cropLogs.farmerId, entry.farmerId))
      .orderBy(desc(cropLogs.createdAt))
      .limit(1);

    const previousHash = lastEntry?.contentHash ?? null;
    const now = new Date();

    const contentHash = await computeCropLogHash({
      description: entry.description,
      images: entry.images,
      farmerId: entry.farmerId,
      timestamp: now.toISOString(),
    });

    const [record] = await db
      .insert(cropLogs)
      .values({
        farmerId: entry.farmerId,
        productId: entry.productId,
        type: entry.type,
        description: entry.description,
        images: entry.images,
        data: entry.data,
        contentHash,
        previousHash,
        createdAt: now,
      })
      .returning();

    return {
      id: record.id,
      farmerId: record.farmerId,
      productId: record.productId ?? undefined,
      type: record.type,
      description: record.description,
      images: record.images,
      data: record.data ?? undefined,
      contentHash: record.contentHash,
      previousHash: record.previousHash,
      createdAt: record.createdAt,
    };
  }

  async getByFarmer(farmerId: string): Promise<CropLogRecord[]> {
    const records = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.farmerId, farmerId))
      .orderBy(desc(cropLogs.createdAt));

    return records.map((r) => ({
      id: r.id,
      farmerId: r.farmerId,
      productId: r.productId ?? undefined,
      type: r.type,
      description: r.description,
      images: r.images,
      data: r.data ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async getByProduct(productId: string): Promise<CropLogRecord[]> {
    const records = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.productId, productId))
      .orderBy(desc(cropLogs.createdAt));

    return records.map((r) => ({
      id: r.id,
      farmerId: r.farmerId,
      productId: r.productId ?? undefined,
      type: r.type,
      description: r.description,
      images: r.images,
      data: r.data ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async verify(entryId: string): Promise<boolean> {
    const [record] = await db
      .select()
      .from(cropLogs)
      .where(eq(cropLogs.id, entryId))
      .limit(1);

    if (!record) return false;

    const recomputedHash = await computeCropLogHash({
      description: record.description,
      images: record.images,
      farmerId: record.farmerId,
      timestamp: record.createdAt.toISOString(),
    });

    return recomputedHash === record.contentHash;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/farming/repository/postgres.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/farming/repository/postgres.ts tests/domains/farming/repository/postgres.test.ts
git commit -m "feat: add PostgresCropLogRepository with SHA-256 hash chain"
```

---

### Task 6: Farming Domain — Validation Schema + Tests

**Files:**
- Create: `src/domains/farming/schemas/validation.ts`
- Create: `tests/domains/farming/schemas/validation.test.ts`

- [ ] **Step 1: Write validation tests**

```typescript
// tests/domains/farming/schemas/validation.test.ts
import { describe, it, expect } from "vitest";
import { createCropLogSchema } from "@/domains/farming/schemas/validation";

describe("createCropLogSchema", () => {
  const validInput = {
    type: "PLANTING" as const,
    description: "Posadzono pomidory na polu nr 3",
    productId: "prod-1",
  };

  it("accepts valid input", () => {
    const result = createCropLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty description", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      type: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional data fields", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      data: { crop: "Pomidory", area: "0.5ha", quantity: "200kg" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional images array", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      images: ["img1.jpg", "img2.jpg"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images).toHaveLength(2);
    }
  });

  it("defaults images to empty array", () => {
    const result = createCropLogSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images).toEqual([]);
    }
  });

  it("rejects description over 5000 chars", () => {
    const result = createCropLogSchema.safeParse({
      ...validInput,
      description: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts without productId", () => {
    const { productId, ...withoutProduct } = validInput;
    const result = createCropLogSchema.safeParse(withoutProduct);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/farming/schemas/validation.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create validation schema**

```typescript
// src/domains/farming/schemas/validation.ts
import { z } from "zod";

export const createCropLogSchema = z.object({
  type: z.enum(["PLANTING", "GROWING", "TREATMENT", "HARVEST", "OTHER"]),
  description: z.string().min(1, "Opis jest wymagany").max(5000),
  productId: z.string().optional(),
  images: z.array(z.string()).max(10).default([]),
  data: z
    .object({
      crop: z.string().optional(),
      area: z.string().optional(),
      quantity: z.string().optional(),
      method: z.string().optional(),
    })
    .optional(),
});

export type CreateCropLogInput = z.input<typeof createCropLogSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/farming/schemas/validation.test.ts
```
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domains/farming/schemas/validation.ts tests/domains/farming/schemas/validation.test.ts
git commit -m "feat: add crop log validation schema with tests"
```

---

### Task 7: Farming Domain — Server Action + Tests

**Files:**
- Create: `src/domains/farming/actions/create-crop-log.ts`
- Create: `tests/domains/farming/actions/create-crop-log.test.ts`

- [ ] **Step 1: Write action tests**

```typescript
// tests/domains/farming/actions/create-crop-log.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCropLog } from "@/domains/farming/actions/create-crop-log";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/domains/farming/repository/postgres", () => ({
  PostgresCropLogRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      id: "log-1",
      farmerId: "user-1",
      type: "PLANTING",
      description: "Posadzono pomidory",
      images: [],
      contentHash: "abc123",
      previousHash: null,
      createdAt: new Date(),
    }),
  })),
}));

describe("createCropLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createCropLog({
      type: "PLANTING",
      description: "Posadzono pomidory",
    });

    expect(result.success).toBe(false);
  });

  it("returns error for empty description", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const result = await createCropLog({
      type: "PLANTING",
      description: "",
    });

    expect(result.success).toBe(false);
  });

  it("creates crop log on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const result = await createCropLog({
      type: "PLANTING",
      description: "Posadzono pomidory na polu nr 3",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.logId).toBe("log-1");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/farming/actions/create-crop-log.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create server action**

```typescript
// src/domains/farming/actions/create-crop-log.ts
"use server";

import { auth } from "@/domains/auth/lib/auth";
import { createCropLogSchema, type CreateCropLogInput } from "../schemas/validation";
import { PostgresCropLogRepository } from "../repository/postgres";

type CreateCropLogResult =
  | { success: true; logId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createCropLog(
  input: CreateCropLogInput
): Promise<CreateCropLogResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createCropLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const repo = new PostgresCropLogRepository();
  const record = await repo.create({
    farmerId: session.user.id,
    ...parsed.data,
  });

  return { success: true, logId: record.id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/farming/actions/create-crop-log.test.ts
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domains/farming/actions/create-crop-log.ts tests/domains/farming/actions/create-crop-log.test.ts
git commit -m "feat: add createCropLog server action with tests"
```

---

### Task 8: Farming Domain — Queries

**Files:**
- Create: `src/domains/farming/queries/get-crop-logs.ts`

- [ ] **Step 1: Create query functions**

```typescript
// src/domains/farming/queries/get-crop-logs.ts
import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { cropLogs, users, products } from "@/shared/db/schema";

export async function getCropLogsByFarmer(farmerId: string) {
  return db
    .select({
      id: cropLogs.id,
      type: cropLogs.type,
      description: cropLogs.description,
      images: cropLogs.images,
      data: cropLogs.data,
      contentHash: cropLogs.contentHash,
      previousHash: cropLogs.previousHash,
      createdAt: cropLogs.createdAt,
      product: {
        id: products.id,
        name: products.name,
      },
    })
    .from(cropLogs)
    .leftJoin(products, eq(cropLogs.productId, products.id))
    .where(eq(cropLogs.farmerId, farmerId))
    .orderBy(desc(cropLogs.createdAt));
}

export async function getCropLogsByProduct(productId: string) {
  return db
    .select({
      id: cropLogs.id,
      type: cropLogs.type,
      description: cropLogs.description,
      images: cropLogs.images,
      data: cropLogs.data,
      contentHash: cropLogs.contentHash,
      previousHash: cropLogs.previousHash,
      createdAt: cropLogs.createdAt,
      farmer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(cropLogs)
    .innerJoin(users, eq(cropLogs.farmerId, users.id))
    .where(eq(cropLogs.productId, productId))
    .orderBy(desc(cropLogs.createdAt));
}

export type FarmerCropLog = Awaited<
  ReturnType<typeof getCropLogsByFarmer>
>[number];
export type ProductCropLog = Awaited<
  ReturnType<typeof getCropLogsByProduct>
>[number];
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/farming/queries/get-crop-logs.ts
git commit -m "feat: add crop log queries — by farmer and by product"
```

---

### Task 9: Reputation Domain — Types + Repository Interface

**Files:**
- Create: `src/domains/reputation/types.ts`

- [ ] **Step 1: Define types and repository interface**

```typescript
// src/domains/reputation/types.ts

export interface ReviewEntry {
  reviewerId: string;
  targetId: string;
  productId?: string;
  overall: number;
  dimensions?: {
    quality?: number;
    communication?: number;
    punctuality?: number;
    accuracy?: number;
  };
  comment?: string;
}

export interface ReviewRecord extends ReviewEntry {
  id: string;
  contentHash: string;
  previousHash: string | null;
  createdAt: Date;
}

export interface ReviewRepository {
  create(entry: ReviewEntry): Promise<ReviewRecord>;
  getByTarget(targetId: string): Promise<ReviewRecord[]>;
  getByReviewer(reviewerId: string): Promise<ReviewRecord[]>;
  verify(entryId: string): Promise<boolean>;
}

export interface ReputationStats {
  averageRating: number;
  reviewCount: number;
  dimensionAverages: {
    quality: number | null;
    communication: number | null;
    punctuality: number | null;
    accuracy: number | null;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/reputation/types.ts
git commit -m "feat: add ReviewRepository interface and reputation types"
```

---

### Task 10: Reputation Domain — PostgresReviewRepository

**Files:**
- Create: `src/domains/reputation/repository/postgres.ts`
- Create: `tests/domains/reputation/repository/postgres.test.ts`

- [ ] **Step 1: Write hash tests**

```typescript
// tests/domains/reputation/repository/postgres.test.ts
import { describe, it, expect, vi } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn(),
          }),
        }),
        orderBy: vi.fn(),
      }),
    }),
  };
  return { db: mockDb };
});

describe("computeReviewHash", () => {
  it("produces consistent SHA-256 hex string", async () => {
    const { computeReviewHash } = await import(
      "@/domains/reputation/repository/postgres"
    );

    const hash = await computeReviewHash({
      reviewerId: "user-1",
      targetId: "user-2",
      dimensions: { quality: 5 },
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes for different reviewers", async () => {
    const { computeReviewHash } = await import(
      "@/domains/reputation/repository/postgres"
    );

    const hash1 = await computeReviewHash({
      reviewerId: "user-1",
      targetId: "user-2",
      dimensions: { quality: 5 },
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    const hash2 = await computeReviewHash({
      reviewerId: "user-3",
      targetId: "user-2",
      dimensions: { quality: 5 },
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hash1).not.toBe(hash2);
  });

  it("includes dimensions in hash", async () => {
    const { computeReviewHash } = await import(
      "@/domains/reputation/repository/postgres"
    );

    const hash1 = await computeReviewHash({
      reviewerId: "user-1",
      targetId: "user-2",
      dimensions: { quality: 5 },
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    const hash2 = await computeReviewHash({
      reviewerId: "user-1",
      targetId: "user-2",
      dimensions: { quality: 3 },
      timestamp: "2026-03-28T10:00:00.000Z",
    });

    expect(hash1).not.toBe(hash2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/reputation/repository/postgres.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement PostgresReviewRepository**

```typescript
// src/domains/reputation/repository/postgres.ts
import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews } from "@/shared/db/schema";
import type {
  ReviewEntry,
  ReviewRecord,
  ReviewRepository,
} from "../types";

export async function computeReviewHash(input: {
  reviewerId: string;
  targetId: string;
  dimensions?: Record<string, number | undefined>;
  timestamp: string;
}): Promise<string> {
  const payload = JSON.stringify({
    reviewerId: input.reviewerId,
    targetId: input.targetId,
    dimensions: input.dimensions,
    timestamp: input.timestamp,
  });

  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class PostgresReviewRepository implements ReviewRepository {
  async create(entry: ReviewEntry): Promise<ReviewRecord> {
    const [lastReview] = await db
      .select({ contentHash: reviews.contentHash })
      .from(reviews)
      .where(eq(reviews.reviewerId, entry.reviewerId))
      .orderBy(desc(reviews.createdAt))
      .limit(1);

    const previousHash = lastReview?.contentHash ?? null;
    const now = new Date();

    const contentHash = await computeReviewHash({
      reviewerId: entry.reviewerId,
      targetId: entry.targetId,
      dimensions: entry.dimensions,
      timestamp: now.toISOString(),
    });

    const [record] = await db
      .insert(reviews)
      .values({
        reviewerId: entry.reviewerId,
        targetId: entry.targetId,
        productId: entry.productId,
        overall: entry.overall,
        dimensions: entry.dimensions,
        comment: entry.comment,
        contentHash,
        previousHash,
        createdAt: now,
      })
      .returning();

    return {
      id: record.id,
      reviewerId: record.reviewerId,
      targetId: record.targetId,
      productId: record.productId ?? undefined,
      overall: record.overall,
      dimensions: record.dimensions ?? undefined,
      comment: record.comment ?? undefined,
      contentHash: record.contentHash,
      previousHash: record.previousHash,
      createdAt: record.createdAt,
    };
  }

  async getByTarget(targetId: string): Promise<ReviewRecord[]> {
    const records = await db
      .select()
      .from(reviews)
      .where(eq(reviews.targetId, targetId))
      .orderBy(desc(reviews.createdAt));

    return records.map((r) => ({
      id: r.id,
      reviewerId: r.reviewerId,
      targetId: r.targetId,
      productId: r.productId ?? undefined,
      overall: r.overall,
      dimensions: r.dimensions ?? undefined,
      comment: r.comment ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async getByReviewer(reviewerId: string): Promise<ReviewRecord[]> {
    const records = await db
      .select()
      .from(reviews)
      .where(eq(reviews.reviewerId, reviewerId))
      .orderBy(desc(reviews.createdAt));

    return records.map((r) => ({
      id: r.id,
      reviewerId: r.reviewerId,
      targetId: r.targetId,
      productId: r.productId ?? undefined,
      overall: r.overall,
      dimensions: r.dimensions ?? undefined,
      comment: r.comment ?? undefined,
      contentHash: r.contentHash,
      previousHash: r.previousHash,
      createdAt: r.createdAt,
    }));
  }

  async verify(entryId: string): Promise<boolean> {
    const [record] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.id, entryId))
      .limit(1);

    if (!record) return false;

    const recomputedHash = await computeReviewHash({
      reviewerId: record.reviewerId,
      targetId: record.targetId,
      dimensions: record.dimensions ?? undefined,
      timestamp: record.createdAt.toISOString(),
    });

    return recomputedHash === record.contentHash;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/reputation/repository/postgres.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domains/reputation/repository/postgres.ts tests/domains/reputation/repository/postgres.test.ts
git commit -m "feat: add PostgresReviewRepository with SHA-256 hash chain"
```

---

### Task 11: Reputation Domain — Validation Schema + Tests

**Files:**
- Create: `src/domains/reputation/schemas/validation.ts`
- Create: `tests/domains/reputation/schemas/validation.test.ts`

- [ ] **Step 1: Write validation tests**

```typescript
// tests/domains/reputation/schemas/validation.test.ts
import { describe, it, expect } from "vitest";
import { createReviewSchema } from "@/domains/reputation/schemas/validation";

describe("createReviewSchema", () => {
  const validInput = {
    targetId: "user-2",
    overall: 4,
    comment: "Swietne pomidory!",
  };

  it("accepts valid input", () => {
    const result = createReviewSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing targetId", () => {
    const { targetId, ...without } = validInput;
    const result = createReviewSchema.safeParse(without);
    expect(result.success).toBe(false);
  });

  it("rejects overall below 1", () => {
    const result = createReviewSchema.safeParse({ ...validInput, overall: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects overall above 5", () => {
    const result = createReviewSchema.safeParse({ ...validInput, overall: 6 });
    expect(result.success).toBe(false);
  });

  it("accepts dimensions", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      dimensions: { quality: 5, communication: 4 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects dimension values below 1", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      dimensions: { quality: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects dimension values above 5", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      dimensions: { quality: 6 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts without comment", () => {
    const { comment, ...withoutComment } = validInput;
    const result = createReviewSchema.safeParse(withoutComment);
    expect(result.success).toBe(true);
  });

  it("accepts optional productId", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      productId: "prod-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects comment over 5000 chars", () => {
    const result = createReviewSchema.safeParse({
      ...validInput,
      comment: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/reputation/schemas/validation.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create validation schema**

```typescript
// src/domains/reputation/schemas/validation.ts
import { z } from "zod";

const dimensionScore = z.number().int().min(1).max(5).optional();

export const createReviewSchema = z.object({
  targetId: z.string().min(1),
  productId: z.string().optional(),
  overall: z.number().int().min(1).max(5),
  dimensions: z
    .object({
      quality: dimensionScore,
      communication: dimensionScore,
      punctuality: dimensionScore,
      accuracy: dimensionScore,
    })
    .optional(),
  comment: z.string().max(5000).optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/reputation/schemas/validation.test.ts
```
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domains/reputation/schemas/validation.ts tests/domains/reputation/schemas/validation.test.ts
git commit -m "feat: add review validation schema with tests"
```

---

### Task 12: Reputation Domain — Server Action + Tests

**Files:**
- Create: `src/domains/reputation/actions/create-review.ts`
- Create: `tests/domains/reputation/actions/create-review.test.ts`

- [ ] **Step 1: Write action tests**

```typescript
// tests/domains/reputation/actions/create-review.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createReview } from "@/domains/reputation/actions/create-review";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/domains/reputation/repository/postgres", () => ({
  PostgresReviewRepository: vi.fn().mockImplementation(() => ({
    create: vi.fn().mockResolvedValue({
      id: "review-1",
      reviewerId: "user-1",
      targetId: "user-2",
      overall: 5,
      contentHash: "abc123",
      previousHash: null,
      createdAt: new Date(),
    }),
  })),
}));

describe("createReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createReview({
      targetId: "user-2",
      overall: 5,
    });

    expect(result.success).toBe(false);
  });

  it("returns error when reviewing self", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const result = await createReview({
      targetId: "user-1",
      overall: 5,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie mozesz ocenic siebie");
    }
  });

  it("creates review on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const result = await createReview({
      targetId: "user-2",
      overall: 5,
      comment: "Swietne produkty!",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.reviewId).toBe("review-1");
    }
  });

  it("returns error for invalid rating", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
    } as any);

    const result = await createReview({
      targetId: "user-2",
      overall: 0,
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/reputation/actions/create-review.test.ts
```
Expected: FAIL

- [ ] **Step 3: Create server action**

```typescript
// src/domains/reputation/actions/create-review.ts
"use server";

import { auth } from "@/domains/auth/lib/auth";
import {
  createReviewSchema,
  type CreateReviewInput,
} from "../schemas/validation";
import { PostgresReviewRepository } from "../repository/postgres";

type CreateReviewResult =
  | { success: true; reviewId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createReview(
  input: CreateReviewInput
): Promise<CreateReviewResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (parsed.data.targetId === session.user.id) {
    return { success: false, error: "Nie mozesz ocenic siebie" };
  }

  const repo = new PostgresReviewRepository();
  const record = await repo.create({
    reviewerId: session.user.id,
    ...parsed.data,
  });

  return { success: true, reviewId: record.id };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/reputation/actions/create-review.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/domains/reputation/actions/create-review.ts tests/domains/reputation/actions/create-review.test.ts
git commit -m "feat: add createReview server action with self-review guard"
```

---

### Task 13: Reputation Domain — Queries

**Files:**
- Create: `src/domains/reputation/queries/get-reviews.ts`
- Create: `src/domains/reputation/queries/get-reputation.ts`

- [ ] **Step 1: Create get-reviews query**

```typescript
// src/domains/reputation/queries/get-reviews.ts
import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews, users, products } from "@/shared/db/schema";

export async function getReviewsByTarget(targetId: string) {
  return db
    .select({
      id: reviews.id,
      overall: reviews.overall,
      dimensions: reviews.dimensions,
      comment: reviews.comment,
      contentHash: reviews.contentHash,
      createdAt: reviews.createdAt,
      reviewer: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      product: {
        id: products.id,
        name: products.name,
      },
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .leftJoin(products, eq(reviews.productId, products.id))
    .where(eq(reviews.targetId, targetId))
    .orderBy(desc(reviews.createdAt));
}

export type UserReview = Awaited<
  ReturnType<typeof getReviewsByTarget>
>[number];
```

- [ ] **Step 2: Create get-reputation query**

```typescript
// src/domains/reputation/queries/get-reputation.ts
import { eq, sql, avg, count } from "drizzle-orm";
import { db } from "@/shared/db";
import { reviews } from "@/shared/db/schema";
import type { ReputationStats } from "../types";

export async function getReputation(userId: string): Promise<ReputationStats> {
  const [stats] = await db
    .select({
      averageRating: avg(reviews.overall),
      reviewCount: count(),
    })
    .from(reviews)
    .where(eq(reviews.targetId, userId));

  return {
    averageRating: stats.averageRating ? parseFloat(stats.averageRating) : 0,
    reviewCount: stats.reviewCount,
    dimensionAverages: {
      quality: null,
      communication: null,
      punctuality: null,
      accuracy: null,
    },
  };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/reputation/queries/get-reviews.ts src/domains/reputation/queries/get-reputation.ts
git commit -m "feat: add review queries and reputation stats"
```

---

### Task 14: i18n — Farming + Reputation Translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add farming and reputation translation sections**

Add after the `"event"` section in `messages/pl.json`:

```json
  "farming": {
    "cropLog": "Dziennik upraw",
    "addEntry": "Dodaj wpis",
    "typePlanting": "Sadzenie",
    "typeGrowing": "Uprawa",
    "typeTreatment": "Zabieg",
    "typeHarvest": "Zbiory",
    "typeOther": "Inne",
    "description": "Opis",
    "crop": "Roslina",
    "area": "Powierzchnia",
    "quantity": "Ilosc",
    "method": "Metoda",
    "images": "Zdjecia",
    "product": "Produkt",
    "noEntries": "Brak wpisow w dzienniku upraw",
    "hashVerified": "Hash zweryfikowany",
    "hashChain": "Lancuch hash",
    "entryCreated": "Wpis dodany",
    "selectProduct": "Wybierz produkt (opcjonalnie)"
  },
  "reputation": {
    "reviews": "Opinie",
    "addReview": "Dodaj opinie",
    "rating": "Ocena",
    "overall": "Ocena ogolna",
    "comment": "Komentarz",
    "quality": "Jakosc",
    "communication": "Komunikacja",
    "punctuality": "Punktualnosc",
    "accuracy": "Zgodnosc z opisem",
    "noReviews": "Brak opinii",
    "averageRating": "Srednia ocena",
    "reviewCount": "opinii",
    "reviewCreated": "Opinia dodana",
    "cannotReviewSelf": "Nie mozesz ocenic siebie",
    "stars": "gwiazdek"
  }
```

- [ ] **Step 2: Commit**

```bash
git add messages/pl.json
git commit -m "feat: add farming and reputation i18n translations"
```

---

### Task 15: Farming UI Components

**Files:**
- Create: `src/domains/farming/components/crop-log-card.tsx`
- Create: `src/domains/farming/components/crop-log-form.tsx`
- Create: `src/domains/farming/components/crop-log-list.tsx`

- [ ] **Step 1: Create crop-log-card**

```tsx
// src/domains/farming/components/crop-log-card.tsx
import { useTranslations } from "next-intl";
import { Sprout, ShieldCheck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import type { FarmerCropLog } from "../queries/get-crop-logs";

interface CropLogCardProps {
  entry: FarmerCropLog;
}

const typeKeys: Record<string, string> = {
  PLANTING: "typePlanting",
  GROWING: "typeGrowing",
  TREATMENT: "typeTreatment",
  HARVEST: "typeHarvest",
  OTHER: "typeOther",
};

export function CropLogCard({ entry }: CropLogCardProps) {
  const t = useTranslations("farming");

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm">{t(typeKeys[entry.type])}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {entry.product?.name && (
              <Badge variant="outline" className="text-[10px]">
                {entry.product.name}
              </Badge>
            )}
            <Badge variant="secondary" className="text-[10px] gap-1">
              <ShieldCheck className="h-3 w-3" />
              {entry.contentHash.slice(0, 8)}...
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm whitespace-pre-wrap">{entry.description}</p>

        {entry.data && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {entry.data.crop && (
              <span>
                {t("crop")}: {entry.data.crop}
              </span>
            )}
            {entry.data.area && (
              <span>
                {t("area")}: {entry.data.area}
              </span>
            )}
            {entry.data.quantity && (
              <span>
                {t("quantity")}: {entry.data.quantity}
              </span>
            )}
            {entry.data.method && (
              <span>
                {t("method")}: {entry.data.method}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {new Date(entry.createdAt).toLocaleDateString("pl-PL", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create crop-log-form**

```tsx
// src/domains/farming/components/crop-log-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { createCropLog } from "../actions/create-crop-log";

interface CropLogFormProps {
  products?: { id: string; name: string }[];
}

export function CropLogForm({ products }: CropLogFormProps) {
  const t = useTranslations("farming");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<
    "PLANTING" | "GROWING" | "TREATMENT" | "HARVEST" | "OTHER"
  >("PLANTING");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [crop, setCrop] = useState("");
  const [area, setArea] = useState("");
  const [quantity, setQuantity] = useState("");
  const [method, setMethod] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const data: Record<string, string> = {};
    if (crop) data.crop = crop;
    if (area) data.area = area;
    if (quantity) data.quantity = quantity;
    if (method) data.method = method;

    startTransition(async () => {
      const result = await createCropLog({
        type,
        description: description.trim(),
        productId: productId || undefined,
        data: Object.keys(data).length > 0 ? data : undefined,
      });

      if (result.success) {
        router.refresh();
        setDescription("");
        setCrop("");
        setArea("");
        setQuantity("");
        setMethod("");
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <div className="space-y-2">
        <Label>{t("typePlanting")}</Label>
        <Select
          value={type}
          onValueChange={(v) =>
            setType(
              v as "PLANTING" | "GROWING" | "TREATMENT" | "HARVEST" | "OTHER"
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PLANTING">{t("typePlanting")}</SelectItem>
            <SelectItem value="GROWING">{t("typeGrowing")}</SelectItem>
            <SelectItem value="TREATMENT">{t("typeTreatment")}</SelectItem>
            <SelectItem value="HARVEST">{t("typeHarvest")}</SelectItem>
            <SelectItem value="OTHER">{t("typeOther")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("description")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
        />
      </div>

      {products && products.length > 0 && (
        <div className="space-y-2">
          <Label>{t("selectProduct")}</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectProduct")} />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="crop">{t("crop")}</Label>
          <Input
            id="crop"
            value={crop}
            onChange={(e) => setCrop(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="area">{t("area")}</Label>
          <Input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">{t("quantity")}</Label>
          <Input
            id="quantity"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">{t("method")}</Label>
          <Input
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {t("addEntry")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create crop-log-list**

```tsx
// src/domains/farming/components/crop-log-list.tsx
import { useTranslations } from "next-intl";
import { CropLogCard } from "./crop-log-card";
import type { FarmerCropLog } from "../queries/get-crop-logs";

interface CropLogListProps {
  entries: FarmerCropLog[];
}

export function CropLogList({ entries }: CropLogListProps) {
  const t = useTranslations("farming");

  if (entries.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        {t("noEntries")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <CropLogCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/farming/components/crop-log-card.tsx src/domains/farming/components/crop-log-form.tsx src/domains/farming/components/crop-log-list.tsx
git commit -m "feat: add crop log UI components — card, form, list"
```

---

### Task 16: Reputation UI Components

**Files:**
- Create: `src/domains/reputation/components/review-card.tsx`
- Create: `src/domains/reputation/components/review-form.tsx`
- Create: `src/domains/reputation/components/reputation-badge.tsx`

- [ ] **Step 1: Create review-card**

```tsx
// src/domains/reputation/components/review-card.tsx
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Star, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent } from "@/shared/ui/card";
import type { UserReview } from "../queries/get-reviews";

interface ReviewCardProps {
  review: UserReview;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const t = useTranslations("reputation");

  const initials = review.reviewer.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/social/users/${review.reviewer.id}`}
            className="flex items-center gap-2"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={review.reviewer.avatar ?? undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{review.reviewer.name}</span>
          </Link>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < review.overall
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
            ))}
          </div>
        </div>

        {review.comment && (
          <p className="text-sm whitespace-pre-wrap">{review.comment}</p>
        )}

        {review.dimensions && (
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            {review.dimensions.quality != null && (
              <span>
                {t("quality")}: {review.dimensions.quality}/5
              </span>
            )}
            {review.dimensions.communication != null && (
              <span>
                {t("communication")}: {review.dimensions.communication}/5
              </span>
            )}
            {review.dimensions.punctuality != null && (
              <span>
                {t("punctuality")}: {review.dimensions.punctuality}/5
              </span>
            )}
            {review.dimensions.accuracy != null && (
              <span>
                {t("accuracy")}: {review.dimensions.accuracy}/5
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {new Date(review.createdAt).toLocaleDateString("pl-PL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <ShieldCheck className="h-3 w-3" />
            {review.contentHash.slice(0, 8)}...
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Create review-form**

```tsx
// src/domains/reputation/components/review-form.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { createReview } from "../actions/create-review";

interface ReviewFormProps {
  targetId: string;
  productId?: string;
}

export function ReviewForm({ targetId, productId }: ReviewFormProps) {
  const t = useTranslations("reputation");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [overall, setOverall] = useState(0);
  const [quality, setQuality] = useState(0);
  const [communication, setCommunication] = useState(0);
  const [punctuality, setPunctuality] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (overall === 0) return;
    setError("");

    const dimensions: Record<string, number> = {};
    if (quality > 0) dimensions.quality = quality;
    if (communication > 0) dimensions.communication = communication;
    if (punctuality > 0) dimensions.punctuality = punctuality;
    if (accuracy > 0) dimensions.accuracy = accuracy;

    startTransition(async () => {
      const result = await createReview({
        targetId,
        productId,
        overall,
        dimensions:
          Object.keys(dimensions).length > 0 ? dimensions : undefined,
        comment: comment.trim() || undefined,
      });

      if (result.success) {
        router.refresh();
        setOverall(0);
        setQuality(0);
        setCommunication(0);
        setPunctuality(0);
        setAccuracy(0);
        setComment("");
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <div className="space-y-2">
        <Label>{t("overall")}</Label>
        <StarRating value={overall} onChange={setOverall} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">{t("quality")}</Label>
          <StarRating value={quality} onChange={setQuality} size="sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("communication")}</Label>
          <StarRating
            value={communication}
            onChange={setCommunication}
            size="sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("punctuality")}</Label>
          <StarRating
            value={punctuality}
            onChange={setPunctuality}
            size="sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("accuracy")}</Label>
          <StarRating value={accuracy} onChange={setAccuracy} size="sm" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="comment">{t("comment")}</Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button
        type="submit"
        disabled={isPending || overall === 0}
        className="w-full"
      >
        {t("addReview")}
      </Button>
    </form>
  );
}

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i + 1)}
          className="focus:outline-none"
        >
          <Star
            className={cn(
              iconSize,
              i < value
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground hover:text-yellow-400"
            )}
          />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create reputation-badge**

```tsx
// src/domains/reputation/components/reputation-badge.tsx
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import type { ReputationStats } from "../types";

interface ReputationBadgeProps {
  stats: ReputationStats;
}

export function ReputationBadge({ stats }: ReputationBadgeProps) {
  const t = useTranslations("reputation");

  if (stats.reviewCount === 0) {
    return (
      <span className="text-xs text-muted-foreground">{t("noReviews")}</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
        <span className="text-sm font-medium">
          {stats.averageRating.toFixed(1)}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">
        ({stats.reviewCount} {t("reviewCount")})
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/reputation/components/review-card.tsx src/domains/reputation/components/review-form.tsx src/domains/reputation/components/reputation-badge.tsx
git commit -m "feat: add reputation UI components — review card, form, badge"
```

---

### Task 17: Barrel Exports

**Files:**
- Create: `src/domains/farming/index.ts`
- Create: `src/domains/reputation/index.ts`

- [ ] **Step 1: Create farming barrel export**

```typescript
// src/domains/farming/index.ts
export type {
  CropLogEntry,
  CropLogRecord,
  CropLogRepository,
} from "./types";
export {
  createCropLogSchema,
  type CreateCropLogInput,
} from "./schemas/validation";
export { createCropLog } from "./actions/create-crop-log";
export {
  getCropLogsByFarmer,
  getCropLogsByProduct,
  type FarmerCropLog,
  type ProductCropLog,
} from "./queries/get-crop-logs";
```

- [ ] **Step 2: Create reputation barrel export**

```typescript
// src/domains/reputation/index.ts
export type {
  ReviewEntry,
  ReviewRecord,
  ReviewRepository,
  ReputationStats,
} from "./types";
export {
  createReviewSchema,
  type CreateReviewInput,
} from "./schemas/validation";
export { createReview } from "./actions/create-review";
export {
  getReviewsByTarget,
  type UserReview,
} from "./queries/get-reviews";
export { getReputation } from "./queries/get-reputation";
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/farming/index.ts src/domains/reputation/index.ts
git commit -m "feat: add farming and reputation barrel exports"
```

---

### Task 18: Pages — Crop Log + Reviews

**Files:**
- Create: `src/app/[locale]/(main)/farmers/[id]/crop-log/page.tsx`
- Create: `src/app/[locale]/(main)/social/users/[id]/reviews/page.tsx`

- [ ] **Step 1: Create crop log page**

```tsx
// src/app/[locale]/(main)/farmers/[id]/crop-log/page.tsx
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getCropLogsByFarmer } from "@/domains/farming/queries/get-crop-logs";
import { CropLogList } from "@/domains/farming/components/crop-log-list";
import { CropLogForm } from "@/domains/farming/components/crop-log-form";

export default async function CropLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("farming");
  const session = await auth();
  const entries = await getCropLogsByFarmer(id);
  const isOwner = session?.user?.id === id;

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("cropLog")}</h1>

      {isOwner && <CropLogForm />}

      <CropLogList entries={entries} />
    </div>
  );
}
```

- [ ] **Step 2: Create reviews page**

```tsx
// src/app/[locale]/(main)/social/users/[id]/reviews/page.tsx
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getReviewsByTarget } from "@/domains/reputation/queries/get-reviews";
import { getReputation } from "@/domains/reputation/queries/get-reputation";
import { ReviewCard } from "@/domains/reputation/components/review-card";
import { ReviewForm } from "@/domains/reputation/components/review-form";
import { ReputationBadge } from "@/domains/reputation/components/reputation-badge";

export default async function UserReviewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("reputation");
  const session = await auth();
  const reviews = await getReviewsByTarget(id);
  const stats = await getReputation(id);
  const isOwnProfile = session?.user?.id === id;

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("reviews")}</h1>
        <ReputationBadge stats={stats} />
      </div>

      {session?.user?.id && !isOwnProfile && (
        <ReviewForm targetId={id} />
      )}

      {reviews.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">
          {t("noReviews")}
        </p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(main)/farmers/[id]/crop-log/page.tsx" "src/app/[locale]/(main)/social/users/[id]/reviews/page.tsx"
git commit -m "feat: add crop log and reviews pages"
```

---

### Task 19: Final Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass (previous 97 + new ~24 = ~121)

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors

- [ ] **Step 3: Build**

```bash
npx next build
```
Expected: Build succeeds, new routes visible:
- `/[locale]/farmers/[id]/crop-log`
- `/[locale]/social/users/[id]/reviews`

- [ ] **Step 4: Commit any fixes if needed and push**

```bash
git push
```
