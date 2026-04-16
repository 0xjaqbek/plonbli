# Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** System zaproszeń z generowaniem plakatu PDF z kodem QR, śledzący kto kogo zaprosił do platformy.

**Architecture:** Nowa domena `src/domains/invitations/` z akcją, queries i komponentem react-pdf. Tabela `invitations` (1 kod per user, tworzony leniwie) + kolumna `invitedById` na `users`. Rejestracja przez URL `?invite=CODE` ustawia relację. Route Handler `/api/invite/poster` generuje PDF server-side.

**Tech Stack:** `@react-pdf/renderer` (PDF), `qrcode` (QR data URL), `@paralleldrive/cuid2` (już zainstalowany), Drizzle ORM, Next.js 15 App Router, Vitest

---

### Task 1: Instalacja zależności

**Files:**
- Modify: `package.json` (przez npm install)

- [ ] **Step 1: Zainstaluj biblioteki**

```bash
npm install @react-pdf/renderer qrcode
npm install -D @types/qrcode
```

Expected: brak błędów, pakiety w `node_modules`

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @react-pdf/renderer and qrcode"
```

---

### Task 2: Schema — tabela invitations + kolumna invitedById

**Files:**
- Create: `src/shared/db/schema/invitations.ts`
- Modify: `src/shared/db/schema/users.ts`
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Utwórz `src/shared/db/schema/invitations.ts`**

```ts
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const invitations = pgTable("invitations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 32 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
```

- [ ] **Step 2: Dodaj kolumnę `invitedById` do `src/shared/db/schema/users.ts`**

Zastąp cały plik:

```ts
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  varchar,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const userRoleEnum = pgEnum("user_role", [
  "FARMER",
  "CONSUMER",
  "BOTH",
]);

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  name: varchar("name", { length: 255 }).notNull(),
  avatar: text("avatar"),
  bio: text("bio"),
  role: userRoleEnum("role").notNull().default("CONSUMER"),
  voivodeship: varchar("voivodeship", { length: 50 }),
  county: varchar("county", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  invitedById: text("invited_by_id").references(
    (): AnyPgColumn => users.id,
    { onDelete: "set null" }
  ),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

- [ ] **Step 3: Dodaj `invitationsRelations` do `src/shared/db/schema/relations.ts`**

Na początku pliku dodaj import:
```ts
import { invitations } from "./invitations";
```

Na końcu pliku dodaj:
```ts
export const invitationsRelations = relations(invitations, ({ one }) => ({
  user: one(users, {
    fields: [invitations.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 4: Eksportuj z `src/shared/db/schema/index.ts`**

Dodaj na końcu pliku (przed ostatnią sekcją Relations lub po niej):

```ts
// Invitations
export {
  invitations,
  type Invitation,
  type NewInvitation,
} from "./invitations";
```

Oraz w sekcji `// Relations (new order-related)` lub nowej sekcji Relations dodaj:
```ts
export { invitationsRelations } from "./relations";
```

- [ ] **Step 5: Wygeneruj migrację**

```bash
npx drizzle-kit generate
```

Expected: nowy plik `drizzle/XXXX_*.sql` zawierający:
- `ALTER TABLE "users" ADD COLUMN "invited_by_id" text REFERENCES "users"("id") ON DELETE SET NULL;`
- `CREATE TABLE "invitations" (...)`

- [ ] **Step 6: Zastosuj migrację**

```bash
npx drizzle-kit migrate
```

Expected: `migrations applied successfully` (lub równoważne)

- [ ] **Step 7: Commit**

```bash
git add src/shared/db/schema/ drizzle/
git commit -m "feat(invitations): add invitations table and users.invitedById column"
```

---

### Task 3: Domena — get-or-create-invitation

**Files:**
- Create: `tests/domains/invitations/actions/get-or-create-invitation.test.ts`
- Create: `src/domains/invitations/actions/get-or-create-invitation.ts`

- [ ] **Step 1: Napisz testy (failing)**

Utwórz `tests/domains/invitations/actions/get-or-create-invitation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn(),
    query: {
      invitations: {
        findFirst: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn().mockReturnValue("generated-id"),
}));

describe("getOrCreateInvitation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing invitation if found", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce({
      id: "inv-1",
      userId: "user-1",
      code: "existingcode",
      createdAt: new Date(),
    } as any);

    const { getOrCreateInvitation } = await import(
      "@/domains/invitations/actions/get-or-create-invitation"
    );
    const result = await getOrCreateInvitation("user-1");

    expect(result.code).toBe("existingcode");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates new invitation when none exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(undefined);

    const newInvitation = {
      id: "inv-new",
      userId: "user-1",
      code: "generated-id",
      createdAt: new Date(),
    };

    vi.mocked(db.insert).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValueOnce([newInvitation]),
      }),
    } as any);

    const { getOrCreateInvitation } = await import(
      "@/domains/invitations/actions/get-or-create-invitation"
    );
    const result = await getOrCreateInvitation("user-1");

    expect(db.insert).toHaveBeenCalled();
    expect(result.code).toBe("generated-id");
  });
});
```

- [ ] **Step 2: Uruchom testy — sprawdź że FAILUJĄ**

```bash
npx vitest run tests/domains/invitations/actions/get-or-create-invitation.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Zaimplementuj `src/domains/invitations/actions/get-or-create-invitation.ts`**

```ts
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { db } from "@/shared/db";
import { invitations } from "@/shared/db/schema";
import type { Invitation } from "@/shared/db/schema";

export async function getOrCreateInvitation(userId: string): Promise<Invitation> {
  const existing = await db.query.invitations.findFirst({
    where: eq(invitations.userId, userId),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(invitations)
    .values({ userId, code: createId() })
    .returning();

  return created;
}
```

- [ ] **Step 4: Uruchom testy — sprawdź że PRZECHODZĄ**

```bash
npx vitest run tests/domains/invitations/actions/get-or-create-invitation.test.ts
```

Expected: PASS (2 testy)

- [ ] **Step 5: Commit**

```bash
git add tests/domains/invitations/ src/domains/invitations/
git commit -m "feat(invitations): add getOrCreateInvitation action"
```

---

### Task 4: Domena — get-invited-users

**Files:**
- Create: `tests/domains/invitations/queries/get-invited-users.test.ts`
- Create: `src/domains/invitations/queries/get-invited-users.ts`

- [ ] **Step 1: Napisz testy (failing)**

Utwórz `tests/domains/invitations/queries/get-invited-users.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    select: vi.fn(),
  };
  return { db: mockDb };
});

describe("getInvitedUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of users invited by given userId", async () => {
    const { db } = await import("@/shared/db");
    const mockUsers = [
      { name: "Anna Kowalska", createdAt: new Date("2026-04-10") },
      { name: "Piotr Nowak", createdAt: new Date("2026-04-12") },
    ];

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValueOnce(mockUsers),
        }),
      }),
    } as any);

    const { getInvitedUsers } = await import(
      "@/domains/invitations/queries/get-invited-users"
    );
    const result = await getInvitedUsers("user-1");

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Anna Kowalska");
  });

  it("returns empty array when no one was invited", async () => {
    const { db } = await import("@/shared/db");

    vi.mocked(db.select).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValueOnce([]),
        }),
      }),
    } as any);

    const { getInvitedUsers } = await import(
      "@/domains/invitations/queries/get-invited-users"
    );
    const result = await getInvitedUsers("user-1");

    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Uruchom testy — sprawdź że FAILUJĄ**

```bash
npx vitest run tests/domains/invitations/queries/get-invited-users.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Zaimplementuj `src/domains/invitations/queries/get-invited-users.ts`**

```ts
import { eq, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";

export type InvitedUser = {
  name: string;
  createdAt: Date;
};

export async function getInvitedUsers(userId: string): Promise<InvitedUser[]> {
  return db
    .select({ name: users.name, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.invitedById, userId))
    .orderBy(desc(users.createdAt));
}
```

- [ ] **Step 4: Uruchom testy — sprawdź że PRZECHODZĄ**

```bash
npx vitest run tests/domains/invitations/queries/get-invited-users.test.ts
```

Expected: PASS (2 testy)

- [ ] **Step 5: Commit**

```bash
git add tests/domains/invitations/queries/get-invited-users.test.ts src/domains/invitations/queries/get-invited-users.ts
git commit -m "feat(invitations): add getInvitedUsers query"
```

---

### Task 5: Domena — get-invitation-by-code

**Files:**
- Create: `tests/domains/invitations/queries/get-invitation-by-code.test.ts`
- Create: `src/domains/invitations/queries/get-invitation-by-code.ts`

- [ ] **Step 1: Napisz testy (failing)**

Utwórz `tests/domains/invitations/queries/get-invitation-by-code.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/shared/db", () => {
  const mockDb = {
    query: {
      invitations: {
        findFirst: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

describe("getInvitationByCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns invitation when code exists", async () => {
    const { db } = await import("@/shared/db");
    const inv = { id: "inv-1", userId: "user-1", code: "abc123", createdAt: new Date() };
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(inv as any);

    const { getInvitationByCode } = await import(
      "@/domains/invitations/queries/get-invitation-by-code"
    );
    const result = await getInvitationByCode("abc123");

    expect(result).toEqual(inv);
  });

  it("returns undefined when code does not exist", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(undefined);

    const { getInvitationByCode } = await import(
      "@/domains/invitations/queries/get-invitation-by-code"
    );
    const result = await getInvitationByCode("nonexistent");

    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Uruchom testy — sprawdź że FAILUJĄ**

```bash
npx vitest run tests/domains/invitations/queries/get-invitation-by-code.test.ts
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Zaimplementuj `src/domains/invitations/queries/get-invitation-by-code.ts`**

```ts
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { invitations } from "@/shared/db/schema";
import type { Invitation } from "@/shared/db/schema";

export async function getInvitationByCode(
  code: string
): Promise<Invitation | undefined> {
  return db.query.invitations.findFirst({
    where: eq(invitations.code, code),
  });
}
```

- [ ] **Step 4: Uruchom testy — sprawdź że PRZECHODZĄ**

```bash
npx vitest run tests/domains/invitations/queries/get-invitation-by-code.test.ts
```

Expected: PASS (2 testy)

- [ ] **Step 5: Commit**

```bash
git add tests/domains/invitations/queries/get-invitation-by-code.test.ts src/domains/invitations/queries/get-invitation-by-code.ts
git commit -m "feat(invitations): add getInvitationByCode query"
```

---

### Task 6: Domena — plakat PDF i barrel export

**Files:**
- Create: `src/domains/invitations/lib/poster.tsx`
- Create: `src/domains/invitations/index.ts`

- [ ] **Step 1: Utwórz `src/domains/invitations/lib/poster.tsx`**

```tsx
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 48,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#1a5c1a",
  },
  slogan: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 16,
    color: "#2d8c2d",
    fontFamily: "Helvetica-Oblique",
  },
  description: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 40,
    color: "#444444",
    lineHeight: 1.6,
  },
  qrContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrCode: {
    width: 220,
    height: 220,
  },
  scanText: {
    fontSize: 15,
    textAlign: "center",
    color: "#333333",
    marginBottom: 48,
  },
  footerName: {
    fontSize: 12,
    textAlign: "center",
    color: "#333333",
    marginBottom: 6,
  },
  footerUrl: {
    fontSize: 10,
    textAlign: "center",
    color: "#888888",
  },
});

interface InvitationPosterProps {
  userName: string;
  qrDataUrl: string;
  inviteUrl: string;
}

export function InvitationPoster({ userName, qrDataUrl, inviteUrl }: InvitationPosterProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Plonbli</Text>
        <Text style={styles.slogan}>Kupuj lokalnie. Wspieraj rolników.</Text>
        <Text style={styles.description}>
          Plonbli to platforma łącząca lokalnych rolników z konsumentami.{"\n"}
          Kupuj świeże produkty prosto od rolnika — bez pośredników.{"\n"}
          Dołącz do społeczności i wspieraj lokalną gospodarkę.
        </Text>
        <View style={styles.qrContainer}>
          <Image style={styles.qrCode} src={qrDataUrl} />
        </View>
        <Text style={styles.scanText}>Zeskanuj, żeby dołączyć</Text>
        <Text style={styles.footerName}>Zaproszenie od: {userName}</Text>
        <Text style={styles.footerUrl}>{inviteUrl}</Text>
      </Page>
    </Document>
  );
}
```

- [ ] **Step 2: Utwórz `src/domains/invitations/index.ts`**

```ts
export { getOrCreateInvitation } from "./actions/get-or-create-invitation";
export { getInvitedUsers, type InvitedUser } from "./queries/get-invited-users";
export { getInvitationByCode } from "./queries/get-invitation-by-code";
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/invitations/
git commit -m "feat(invitations): add PDF poster component and domain index"
```

---

### Task 7: Route Handler — generowanie PDF

**Files:**
- Create: `src/app/api/invite/poster/route.tsx`

- [ ] **Step 1: Utwórz `src/app/api/invite/poster/route.tsx`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { auth } from "@/domains/auth/lib/auth";
import { getOrCreateInvitation } from "@/domains/invitations";
import { InvitationPoster } from "@/domains/invitations/lib/poster";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.name) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const invitation = await getOrCreateInvitation(session.user.id);

  const baseUrl = new URL(request.url).origin;
  const inviteUrl = `${baseUrl}/register?invite=${invitation.code}`;

  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    width: 440,
    margin: 1,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });

  const buffer = await renderToBuffer(
    InvitationPoster({
      userName: session.user.name,
      qrDataUrl,
      inviteUrl,
    })
  );

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="zaproszenie.pdf"',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/invite/poster/route.tsx
git commit -m "feat(invitations): add PDF poster Route Handler"
```

---

### Task 8: Rejestracja — obsługa kodu zaproszenia

**Files:**
- Modify: `src/domains/auth/schemas/validation.ts`
- Modify: `src/domains/auth/actions/register.ts`
- Modify: `src/domains/auth/components/register-form.tsx`
- Modify: `src/app/[locale]/(auth)/register/page.tsx`
- Modify: `tests/domains/auth/actions/register.test.ts`

- [ ] **Step 1: Dodaj `inviteCode` do schematu w `src/domains/auth/schemas/validation.ts`**

Dodaj pole do `registerSchema`:

```ts
export const registerSchema = z.object({
  name: z.string().min(1, "Imie jest wymagane").max(255),
  email: z.string().email("Nieprawidlowy adres email").max(255),
  password: z.string().min(8, "Haslo musi miec minimum 8 znakow").max(128),
  role: z.enum(["FARMER", "CONSUMER", "BOTH"]),
  inviteCode: z.string().optional(),
});
```

- [ ] **Step 2: Napisz testy dla register z inviteCode (dodaj do istniejącego pliku testowego)**

Dodaj na końcu `tests/domains/auth/actions/register.test.ts` (wewnątrz `describe("register", ...)`) dwa nowe testy. Najpierw zaktualizuj mock `@/shared/db` — zamiast `query.users.findFirst` potrzebujemy też mock dla `query.invitations.findFirst`:

Zastąp cały plik `tests/domains/auth/actions/register.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { register } from "@/domains/auth/actions/register";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
      invitations: {
        findFirst: vi.fn(),
      },
    },
  };
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mockDb.returning,
    }),
  });
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });
  return { db: mockDb };
});

vi.mock("@/domains/auth/lib/passwords", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

describe("register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid input", async () => {
    const result = await register({
      name: "",
      email: "bad",
      password: "short",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toBeDefined();
  });

  it("returns error when email already exists", async () => {
    const { db } = await import("@/shared/db");
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "existing",
      email: "jan@example.com",
    } as any);

    const result = await register({
      name: "Jan",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors?.email).toBeDefined();
  });

  it("creates user with hashed password on valid input", async () => {
    const { db } = await import("@/shared/db");
    const { hashPassword } = await import("@/domains/auth/lib/passwords");

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.insert({} as any).values({} as any).returning)
      .mockResolvedValueOnce([{ id: "new-id", email: "jan@example.com" }] as any);

    const result = await register({
      name: "Jan Kowalski",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "FARMER",
    });

    expect(hashPassword).toHaveBeenCalledWith("SecurePass123!");
    expect(result.success).toBe(true);
  });

  it("sets invitedById when valid inviteCode is provided", async () => {
    const { db } = await import("@/shared/db");

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce({
      id: "inv-1",
      userId: "inviter-id",
      code: "validcode",
      createdAt: new Date(),
    } as any);
    vi.mocked(db.insert({} as any).values({} as any).returning)
      .mockResolvedValueOnce([{ id: "new-id" }] as any);

    const result = await register({
      name: "Nowy Uzytkownik",
      email: "nowy@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
      inviteCode: "validcode",
    });

    expect(result.success).toBe(true);
    expect(db.update).toHaveBeenCalled();
  });

  it("ignores invalid inviteCode and registers successfully", async () => {
    const { db } = await import("@/shared/db");

    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.query.invitations.findFirst).mockResolvedValueOnce(undefined);
    vi.mocked(db.insert({} as any).values({} as any).returning)
      .mockResolvedValueOnce([{ id: "new-id" }] as any);

    const result = await register({
      name: "Nowy Uzytkownik",
      email: "nowy2@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
      inviteCode: "bogusCode",
    });

    expect(result.success).toBe(true);
    expect(db.update).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Uruchom testy — sprawdź że 2 nowe FAILUJĄ**

```bash
npx vitest run tests/domains/auth/actions/register.test.ts
```

Expected: 3 stare PASS, 2 nowe FAIL

- [ ] **Step 4: Zaktualizuj `src/domains/auth/actions/register.ts`**

```ts
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users, invitations } from "@/shared/db/schema";
import { registerSchema, type RegisterInput } from "../schemas/validation";
import { hashPassword } from "../lib/passwords";

type RegisterResult =
  | { success: true; userId: string }
  | { success: false; errors: Record<string, string[]> };

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, password, role, inviteCode } = parsed.data;

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    return {
      success: false,
      errors: { email: ["Ten adres email jest juz zajety"] },
    };
  }

  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(users)
    .values({ name, email, passwordHash, role })
    .returning({ id: users.id });

  if (inviteCode) {
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.code, inviteCode),
    });
    if (invitation) {
      await db
        .update(users)
        .set({ invitedById: invitation.userId })
        .where(eq(users.id, newUser.id));
    }
  }

  return { success: true, userId: newUser.id };
}
```

- [ ] **Step 5: Uruchom testy — sprawdź że wszystkie PRZECHODZĄ**

```bash
npx vitest run tests/domains/auth/actions/register.test.ts
```

Expected: PASS (5 testów)

- [ ] **Step 6: Zaktualizuj `src/app/[locale]/(auth)/register/page.tsx`**

```tsx
import { RegisterForm } from "@/domains/auth/components/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return <RegisterForm inviteCode={invite} />;
}
```

- [ ] **Step 7: Zaktualizuj `src/domains/auth/components/register-form.tsx`**

Dodaj prop `inviteCode` i przekaż go do `register`. Zmień sygnaturę komponentu i `defaultValues`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "../schemas/validation";
import { register } from "../actions/register";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
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
import Link from "next/link";

interface RegisterFormProps {
  inviteCode?: string;
}

export function RegisterForm({ inviteCode }: RegisterFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "CONSUMER",
      inviteCode: inviteCode ?? "",
    },
  });

  function onSubmit(data: RegisterInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await register(data);
      if (result.success) {
        router.push("/login?registered=true");
      } else {
        if (result.errors.email) {
          form.setError("email", { message: result.errors.email[0] });
        }
        if (result.errors.password) {
          form.setError("password", { message: result.errors.password[0] });
        }
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("password")}</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("role")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CONSUMER">{t("roleConsumer")}</SelectItem>
                  <SelectItem value="FARMER">{t("roleFarmer")}</SelectItem>
                  <SelectItem value="BOTH">{t("roleBoth")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {t("register")}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/login" className="text-primary underline">
            {t("login")}
          </Link>
        </p>
      </form>
    </Form>
  );
}
```

- [ ] **Step 8: Uruchom cały zestaw testów**

```bash
npx vitest run
```

Expected: wszystkie testy PASS

- [ ] **Step 9: Commit**

```bash
git add src/domains/auth/ src/app/
git commit -m "feat(invitations): handle invite code during registration"
```

---

### Task 9: Strona zaproszeń /profile/invite

**Files:**
- Create: `src/app/[locale]/(main)/profile/invite/page.tsx`

- [ ] **Step 1: Utwórz `src/app/[locale]/(main)/profile/invite/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Users, Download, UserCheck } from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { getOrCreateInvitation } from "@/domains/invitations";
import { getInvitedUsers } from "@/domains/invitations";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function InvitePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) redirect("/login");

  const [invitation, invitedUsers] = await Promise.all([
    getOrCreateInvitation(session.user.id),
    getInvitedUsers(session.user.id),
  ]);

  let invitedByName: string | null = null;
  if (user.invitedById) {
    const inviter = await db.query.users.findFirst({
      where: eq(users.id, user.invitedById),
    });
    invitedByName = inviter?.name ?? null;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-bold">Zaproś znajomych</h1>

      {invitedByName && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm flex items-center gap-2 text-muted-foreground">
              <UserCheck className="h-4 w-4 shrink-0" />
              Zostałeś zaproszony przez{" "}
              <span className="font-medium text-foreground">{invitedByName}</span>
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Osoby, które dołączyły przez Twoje zaproszenie
            {invitedUsers.length > 0 && (
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {invitedUsers.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invitedUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Jeszcze nikt nie dołączył przez Twoje zaproszenie.
            </p>
          ) : (
            <ul className="space-y-2">
              {invitedUsers.map((u, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{u.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {u.createdAt.toLocaleDateString("pl-PL")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground mb-4">
            Wygeneruj plakat z kodem QR i podziel się nim ze znajomymi.
            Możesz go wydrukować lub wysłać jako plik.
          </p>
          <a href="/api/invite/poster" download="zaproszenie.pdf">
            <Button className="w-full gap-2">
              <Download className="h-4 w-4" />
              Wygeneruj zaproszenie
            </Button>
          </a>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Twój kod: <span className="font-mono">{invitation.code}</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[locale]/\(main\)/profile/invite/
git commit -m "feat(invitations): add /profile/invite page"
```

---

### Task 10: Przycisk Zaproś na stronie profilu

**Files:**
- Modify: `src/app/[locale]/(main)/profile/page.tsx`

- [ ] **Step 1: Dodaj przycisk "Zaproś" nad "Ustawienia" w `src/app/[locale]/(main)/profile/page.tsx`**

Znajdź fragment z linkiem do `/profile/settings`:

```tsx
<Separator className="my-1" />
<Link
  href="/profile/settings"
  className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
>
  <span className="flex items-center gap-3 text-sm">
    <Settings className="h-4 w-4 text-muted-foreground" />
    {t("settings")}
  </span>
  <ChevronRight className="h-4 w-4 text-muted-foreground" />
</Link>
```

Zastąp go:

```tsx
<Separator className="my-1" />
<Link
  href="/profile/invite"
  className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
>
  <span className="flex items-center gap-3 text-sm">
    <Send className="h-4 w-4 text-muted-foreground" />
    Zaproś znajomych
  </span>
  <ChevronRight className="h-4 w-4 text-muted-foreground" />
</Link>
<Link
  href="/profile/settings"
  className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
>
  <span className="flex items-center gap-3 text-sm">
    <Settings className="h-4 w-4 text-muted-foreground" />
    {t("settings")}
  </span>
  <ChevronRight className="h-4 w-4 text-muted-foreground" />
</Link>
```

Dodaj `Send` do importu z `lucide-react` na początku pliku (dopisz do istniejącego importu):

```tsx
import {
  ShoppingBasket,
  Leaf,
  Star,
  Users,
  FileText,
  Settings,
  ChevronRight,
  UserPlus,
  Plus,
  Pencil,
  MapPin,
  Send,
} from "lucide-react";
```

- [ ] **Step 2: Uruchom cały zestaw testów**

```bash
npx vitest run
```

Expected: wszystkie testy PASS

- [ ] **Step 3: Sprawdź TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero błędów

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/\(main\)/profile/page.tsx
git commit -m "feat(invitations): add Zaproś link to profile page"
```

---

### Task 11: Push i weryfikacja końcowa

- [ ] **Step 1: Uruchom pełen zestaw testów**

```bash
npx vitest run
```

Expected: wszystkie testy PASS

- [ ] **Step 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero błędów

- [ ] **Step 3: Push do remote**

```bash
git push
```
