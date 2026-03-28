# Phase 5: Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an event system with creation, RSVP, recurrence, calendar view, and map view so farmers and consumers can organize markets, open days, and meetups.

**Architecture:** Extends the social domain with events and RSVP tables. Events have geolocation (text lat/lng, matching existing user pattern). Three views: list, calendar (react-day-picker via shadcn), and map (Leaflet with dynamic import for SSR safety). RSVP is toggle-based (GOING/INTERESTED/NOT_GOING). Recurrence is stored but not auto-generated — displayed as info.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL (Neon), Zod, next-intl, Vitest, Leaflet, react-leaflet

---

## File Structure

```
src/
  domains/
    social/
      schemas/validation.ts              # add event schemas
      actions/create-event.ts            # create event
      actions/delete-event.ts            # delete own event
      actions/rsvp-event.ts             # toggle RSVP status
      queries/get-events.ts             # list events with filters
      queries/get-event.ts              # single event with RSVPs
      components/event-card.tsx          # event card for list
      components/event-form.tsx          # create event form
      components/event-detail.tsx        # event detail display
      components/rsvp-button.tsx         # RSVP toggle button
      components/event-calendar.tsx      # calendar view
      components/event-map.tsx           # map view (Leaflet)
      index.ts                          # updated barrel export
  shared/
    db/schema/
      events.ts                         # events table
      event-rsvps.ts                    # event_rsvps table
      relations.ts                      # updated with event relations
      index.ts                          # updated barrel export
    ui/
      calendar.tsx                      # shadcn calendar component
      tabs.tsx                          # shadcn tabs component
  app/[locale]/(main)/
    social/
      events/
        page.tsx                        # events list/calendar/map
        create/page.tsx                 # create event
        [id]/page.tsx                   # event detail
messages/
  pl.json                              # updated with event translations
tests/
  domains/
    social/
      schemas/validation.test.ts        # updated with event tests
      actions/create-event.test.ts
      actions/rsvp-event.test.ts
```

---

## Task 1: Install Dependencies

**Files:** None (package.json only)

- [ ] **Step 1: Install Leaflet and react-leaflet**

```bash
npm install leaflet react-leaflet @types/leaflet
```

- [ ] **Step 2: Add shadcn calendar and tabs components**

```bash
npx shadcn@latest add calendar tabs
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/shared/ui/calendar.tsx src/shared/ui/tabs.tsx
git commit -m "feat: add leaflet, react-leaflet, shadcn calendar and tabs"
```

---

## Task 2: Schema — Events + Event RSVPs

**Files:**
- Create: `src/shared/db/schema/events.ts`
- Create: `src/shared/db/schema/event-rsvps.ts`

- [ ] **Step 1: Create events table schema**

Create `src/shared/db/schema/events.ts`:

```typescript
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  varchar,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { groups } from "./groups";

export const eventTypeEnum = pgEnum("event_type", [
  "MARKET",
  "OPEN_DAY",
  "MEETUP",
  "OTHER",
]);

export const recurrenceEnum = pgEnum("recurrence", [
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
]);

export const events = pgTable("events", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull().default(""),
  type: eventTypeEnum("type").notNull(),
  location: varchar("location", { length: 300 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  recurrence: recurrenceEnum("recurrence"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
```

- [ ] **Step 2: Create event RSVPs table schema**

Create `src/shared/db/schema/event-rsvps.ts`:

```typescript
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { events } from "./events";
import { users } from "./users";

export const rsvpStatusEnum = pgEnum("rsvp_status", [
  "GOING",
  "INTERESTED",
  "NOT_GOING",
]);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: rsvpStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.eventId, table.userId] }),
  ]
);

export type EventRsvp = typeof eventRsvps.$inferSelect;
export type NewEventRsvp = typeof eventRsvps.$inferInsert;
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/db/schema/events.ts src/shared/db/schema/event-rsvps.ts
git commit -m "feat: add events and event RSVPs schema"
```

---

## Task 3: Update Relations + Barrel Export + Push Schema

**Files:**
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Add event relations to relations.ts**

Append after the `followsRelations` export in `src/shared/db/schema/relations.ts`:

```typescript
// Add these imports at the top:
import { events } from "./events";
import { eventRsvps } from "./event-rsvps";

// Add these relations at the end:
export const eventsRelations = relations(events, ({ one, many }) => ({
  creator: one(users, {
    fields: [events.creatorId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [events.groupId],
    references: [groups.id],
  }),
  rsvps: many(eventRsvps),
}));

export const eventRsvpsRelations = relations(eventRsvps, ({ one }) => ({
  event: one(events, {
    fields: [eventRsvps.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventRsvps.userId],
    references: [users.id],
  }),
}));
```

- [ ] **Step 2: Update schema barrel export**

Add the new exports to `src/shared/db/schema/index.ts` — append after follows export, before the relations export:

```typescript
export {
  events,
  eventTypeEnum,
  recurrenceEnum,
  type Event,
  type NewEvent,
} from "./events";
export {
  eventRsvps,
  rsvpStatusEnum,
  type EventRsvp,
  type NewEventRsvp,
} from "./event-rsvps";

// Update the relations export to include event relations:
export {
  categoriesRelations,
  productsRelations,
  listingsRelations,
  conversationsRelations,
  conversationMembersRelations,
  messagesRelations,
  groupsRelations,
  groupMembersRelations,
  postsRelations,
  commentsRelations,
  reactionsRelations,
  followsRelations,
  eventsRelations,
  eventRsvpsRelations,
} from "./relations";
```

- [ ] **Step 3: Push schema to database**

Run: `npx drizzle-kit push`
Expected: `Changes applied` with new tables created.

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/relations.ts src/shared/db/schema/index.ts
git commit -m "feat: update relations and barrel export with event tables"
```

---

## Task 4: Validation Schemas + Tests

**Files:**
- Modify: `src/domains/social/schemas/validation.ts`
- Modify: `tests/domains/social/schemas/validation.test.ts`

- [ ] **Step 1: Add event validation schemas**

Append to `src/domains/social/schemas/validation.ts`:

```typescript
export const createEventSchema = z.object({
  title: z.string().min(1, "Tytul jest wymagany").max(200),
  description: z.string().max(5000).default(""),
  type: z.enum(["MARKET", "OPEN_DAY", "MEETUP", "OTHER"]),
  groupId: z.string().optional(),
  location: z.string().max(300).optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  startDate: z.string().min(1, "Data rozpoczecia jest wymagana"),
  endDate: z.string().min(1, "Data zakonczenia jest wymagana"),
  recurrence: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
});

export const rsvpEventSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["GOING", "INTERESTED", "NOT_GOING"]),
});

export type CreateEventInput = z.input<typeof createEventSchema>;
export type RsvpEventInput = z.infer<typeof rsvpEventSchema>;
```

- [ ] **Step 2: Add event tests**

Append to `tests/domains/social/schemas/validation.test.ts`:

```typescript
import {
  createPostSchema,
  addCommentSchema,
  createGroupSchema,
  createEventSchema,
  rsvpEventSchema,
} from "@/domains/social/schemas/validation";

// ... keep existing tests, add after createGroupSchema describe block:

describe("createEventSchema", () => {
  it("accepts valid event", () => {
    const result = createEventSchema.safeParse({
      title: "Targ rolny w Krakowie",
      type: "MARKET",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("accepts event with all fields", () => {
    const result = createEventSchema.safeParse({
      title: "Dzien otwarty",
      description: "Zapraszamy na nasza farme",
      type: "OPEN_DAY",
      location: "ul. Polna 5, Krakow",
      latitude: "50.0647",
      longitude: "19.9450",
      startDate: "2026-04-20T10:00:00Z",
      endDate: "2026-04-20T18:00:00Z",
      recurrence: "MONTHLY",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = createEventSchema.safeParse({
      title: "",
      type: "MEETUP",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid event type", () => {
    const result = createEventSchema.safeParse({
      title: "Spotkanie",
      type: "PARTY",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing startDate", () => {
    const result = createEventSchema.safeParse({
      title: "Spotkanie",
      type: "MEETUP",
      endDate: "2026-04-15T15:00:00Z",
    });
    expect(result.success).toBe(false);
  });
});

describe("rsvpEventSchema", () => {
  it("accepts valid RSVP", () => {
    const result = rsvpEventSchema.safeParse({
      eventId: "event-1",
      status: "GOING",
    });
    expect(result.success).toBe(true);
  });

  it("accepts INTERESTED status", () => {
    const result = rsvpEventSchema.safeParse({
      eventId: "event-1",
      status: "INTERESTED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = rsvpEventSchema.safeParse({
      eventId: "event-1",
      status: "MAYBE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing eventId", () => {
    const result = rsvpEventSchema.safeParse({
      status: "GOING",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/domains/social/schemas/validation.test.ts`
Expected: all tests PASS (13 existing + 9 new = 22 total).

- [ ] **Step 4: Commit**

```bash
git add src/domains/social/schemas/validation.ts tests/domains/social/schemas/validation.test.ts
git commit -m "feat: add event validation schemas with tests"
```

---

## Task 5: i18n — Event Translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add event translations**

Add the following section to `messages/pl.json` after the `"group"` block (before the closing `}`):

```json
  "event": {
    "events": "Wydarzenia",
    "createEvent": "Utworz wydarzenie",
    "eventTitle": "Tytul",
    "eventDescription": "Opis",
    "eventType": "Typ wydarzenia",
    "typeMarket": "Targ",
    "typeOpenDay": "Dzien otwarty",
    "typeMeetup": "Spotkanie",
    "typeOther": "Inne",
    "location": "Lokalizacja",
    "address": "Adres",
    "startDate": "Data rozpoczecia",
    "endDate": "Data zakonczenia",
    "recurrence": "Powtarzalnosc",
    "recurrenceNone": "Jednorazowe",
    "recurrenceWeekly": "Co tydzien",
    "recurrenceBiweekly": "Co dwa tygodnie",
    "recurrenceMonthly": "Co miesiac",
    "noEvents": "Brak wydarzen",
    "listView": "Lista",
    "calendarView": "Kalendarz",
    "mapView": "Mapa",
    "going": "Ide",
    "interested": "Zainteresowany",
    "notGoing": "Nie ide",
    "attendees": "Uczestnicy",
    "goingCount": "idzie",
    "interestedCount": "zainteresowanych",
    "organizer": "Organizator",
    "eventCreated": "Wydarzenie utworzone",
    "eventDeleted": "Wydarzenie usuniete",
    "confirmDeleteEvent": "Na pewno chcesz usunac to wydarzenie?",
    "upcoming": "Nadchodzace",
    "past": "Minione"
  }
```

- [ ] **Step 2: Add events to nav translations**

Update the `"nav"` section in `messages/pl.json` — add after `"profile"`:

```json
    "events": "Wydarzenia"
```

- [ ] **Step 3: Commit**

```bash
git add messages/pl.json
git commit -m "feat: add event i18n translations (Polish)"
```

---

## Task 6: Server Actions — Create Event, Delete Event, RSVP + Tests

**Files:**
- Create: `src/domains/social/actions/create-event.ts`
- Create: `src/domains/social/actions/delete-event.ts`
- Create: `src/domains/social/actions/rsvp-event.ts`
- Create: `tests/domains/social/actions/create-event.test.ts`
- Create: `tests/domains/social/actions/rsvp-event.test.ts`

- [ ] **Step 1: Write failing tests for create event**

Create `tests/domains/social/actions/create-event.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEvent } from "@/domains/social/actions/create-event";

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

describe("createEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createEvent({
      title: "Targ rolny",
      type: "MARKET",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes zalogowany");
    }
  });

  it("returns error for empty title", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createEvent({
      title: "",
      type: "MARKET",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });

    expect(result.success).toBe(false);
  });

  it("creates event on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "event-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await createEvent({
      title: "Targ rolny w Krakowie",
      type: "MARKET",
      location: "Plac Nowy, Krakow",
      startDate: "2026-04-15T09:00:00Z",
      endDate: "2026-04-15T15:00:00Z",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.eventId).toBe("event-1");
    }
  });
});
```

- [ ] **Step 2: Implement create event action**

Create `src/domains/social/actions/create-event.ts`:

```typescript
"use server";

import { db } from "@/shared/db";
import { events } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createEventSchema,
  type CreateEventInput,
} from "../schemas/validation";

type CreateEventResult =
  | { success: true; eventId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createEvent(
  input: CreateEventInput
): Promise<CreateEventResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const {
    title,
    description,
    type,
    groupId,
    location,
    latitude,
    longitude,
    startDate,
    endDate,
    recurrence,
  } = parsed.data;

  const [event] = await db
    .insert(events)
    .values({
      creatorId: session.user.id,
      groupId: groupId ?? null,
      title,
      description,
      type,
      location: location ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      recurrence: recurrence ?? null,
    })
    .returning({ id: events.id });

  return { success: true, eventId: event.id };
}
```

- [ ] **Step 3: Implement delete event action**

Create `src/domains/social/actions/delete-event.ts`:

```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { events } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type DeleteEventResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteEvent(
  eventId: string
): Promise<DeleteEventResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
  });

  if (!event) {
    return { success: false, error: "Wydarzenie nie istnieje" };
  }

  if (event.creatorId !== session.user.id) {
    return { success: false, error: "Mozesz usuwac tylko swoje wydarzenia" };
  }

  await db.delete(events).where(eq(events.id, eventId));

  return { success: true };
}
```

- [ ] **Step 4: Write failing tests for RSVP**

Create `tests/domains/social/actions/rsvp-event.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { rsvpEvent } from "@/domains/social/actions/rsvp-event";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn(),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
    query: {
      eventRsvps: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("rsvpEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await rsvpEvent({
      eventId: "event-1",
      status: "GOING",
    });

    expect(result.success).toBe(false);
  });

  it("sets RSVP when no existing RSVP", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.eventRsvps.findFirst).mockResolvedValueOnce(undefined);

    const mockValues = vi.fn().mockResolvedValueOnce(undefined);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await rsvpEvent({
      eventId: "event-1",
      status: "GOING",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.status).toBe("GOING");
    }
  });

  it("removes RSVP when same status clicked", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.eventRsvps.findFirst).mockResolvedValueOnce({
      eventId: "event-1",
      userId: "user-1",
      status: "GOING",
      createdAt: new Date(),
    });

    vi.mocked(db.delete).mockReturnValueOnce({
      where: vi.fn().mockResolvedValueOnce(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await rsvpEvent({
      eventId: "event-1",
      status: "GOING",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.status).toBeNull();
    }
  });
});
```

- [ ] **Step 5: Implement RSVP event action**

Create `src/domains/social/actions/rsvp-event.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { eventRsvps } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  rsvpEventSchema,
  type RsvpEventInput,
} from "../schemas/validation";

type RsvpEventResult =
  | { success: true; status: string | null }
  | { success: false; error: string };

export async function rsvpEvent(
  input: RsvpEventInput
): Promise<RsvpEventResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = rsvpEventSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane" };
  }

  const { eventId, status } = parsed.data;

  const existing = await db.query.eventRsvps.findFirst({
    where: and(
      eq(eventRsvps.eventId, eventId),
      eq(eventRsvps.userId, session.user.id)
    ),
  });

  // Toggle off if same status
  if (existing && existing.status === status) {
    await db
      .delete(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, session.user.id)
        )
      );
    return { success: true, status: null };
  }

  // Remove existing and insert new
  if (existing) {
    await db
      .delete(eventRsvps)
      .where(
        and(
          eq(eventRsvps.eventId, eventId),
          eq(eventRsvps.userId, session.user.id)
        )
      );
  }

  await db.insert(eventRsvps).values({
    eventId,
    userId: session.user.id,
    status,
  });

  return { success: true, status };
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run tests/domains/social/`
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domains/social/actions/create-event.ts src/domains/social/actions/delete-event.ts src/domains/social/actions/rsvp-event.ts tests/domains/social/actions/create-event.test.ts tests/domains/social/actions/rsvp-event.test.ts
git commit -m "feat: add event server actions — create, delete, RSVP with tests"
```

---

## Task 7: Queries — Get Events, Get Event Detail

**Files:**
- Create: `src/domains/social/queries/get-events.ts`
- Create: `src/domains/social/queries/get-event.ts`

- [ ] **Step 1: Create get-events query**

Create `src/domains/social/queries/get-events.ts`:

```typescript
import { eq, desc, gte, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { events, users, groups, eventRsvps } from "@/shared/db/schema";

export async function getEvents(options?: {
  upcoming?: boolean;
  groupId?: string;
}) {
  const conditions = [];

  if (options?.upcoming !== false) {
    conditions.push(gte(events.startDate, new Date()));
  }

  if (options?.groupId) {
    conditions.push(eq(events.groupId, options.groupId));
  }

  const allEvents = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      type: events.type,
      location: events.location,
      latitude: events.latitude,
      longitude: events.longitude,
      startDate: events.startDate,
      endDate: events.endDate,
      recurrence: events.recurrence,
      createdAt: events.createdAt,
      creator: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      groupId: events.groupId,
      groupName: groups.name,
    })
    .from(events)
    .innerJoin(users, eq(events.creatorId, users.id))
    .leftJoin(groups, eq(events.groupId, groups.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(events.startDate));

  const enriched = await Promise.all(
    allEvents.map(async (event) => {
      const [{ count: goingCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.status, "GOING")
          )
        );

      const [{ count: interestedCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(eventRsvps)
        .where(
          and(
            eq(eventRsvps.eventId, event.id),
            eq(eventRsvps.status, "INTERESTED")
          )
        );

      return {
        ...event,
        goingCount,
        interestedCount,
      };
    })
  );

  return enriched;
}

export type EventWithDetails = Awaited<ReturnType<typeof getEvents>>[number];
```

- [ ] **Step 2: Create get-event query**

Create `src/domains/social/queries/get-event.ts`:

```typescript
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import { events, users, groups, eventRsvps } from "@/shared/db/schema";

export async function getEvent(eventId: string, currentUserId?: string) {
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      description: events.description,
      type: events.type,
      location: events.location,
      latitude: events.latitude,
      longitude: events.longitude,
      startDate: events.startDate,
      endDate: events.endDate,
      recurrence: events.recurrence,
      createdAt: events.createdAt,
      creator: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      groupId: events.groupId,
      groupName: groups.name,
    })
    .from(events)
    .innerJoin(users, eq(events.creatorId, users.id))
    .leftJoin(groups, eq(events.groupId, groups.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (!event) return null;

  // Get RSVP counts
  const [{ count: goingCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(eventRsvps)
    .where(
      and(eq(eventRsvps.eventId, eventId), eq(eventRsvps.status, "GOING"))
    );

  const [{ count: interestedCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(eventRsvps)
    .where(
      and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.status, "INTERESTED")
      )
    );

  // Get attendees (GOING users)
  const attendees = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      status: eventRsvps.status,
    })
    .from(eventRsvps)
    .innerJoin(users, eq(eventRsvps.userId, users.id))
    .where(eq(eventRsvps.eventId, eventId));

  // Check current user's RSVP
  let currentUserRsvp: string | null = null;
  if (currentUserId) {
    const rsvp = await db.query.eventRsvps.findFirst({
      where: and(
        eq(eventRsvps.eventId, eventId),
        eq(eventRsvps.userId, currentUserId)
      ),
    });
    currentUserRsvp = rsvp?.status ?? null;
  }

  return {
    ...event,
    goingCount,
    interestedCount,
    attendees,
    currentUserRsvp,
  };
}

export type EventDetail = NonNullable<Awaited<ReturnType<typeof getEvent>>>;
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/social/queries/get-events.ts src/domains/social/queries/get-event.ts
git commit -m "feat: add event queries — list and detail with RSVP counts"
```

---

## Task 8: Update Barrel Export

**Files:**
- Modify: `src/domains/social/index.ts`

- [ ] **Step 1: Add event exports to barrel**

Append to `src/domains/social/index.ts`:

```typescript
export {
  createEventSchema,
  rsvpEventSchema,
  type CreateEventInput,
  type RsvpEventInput,
} from "./schemas/validation";
export { createEvent } from "./actions/create-event";
export { deleteEvent } from "./actions/delete-event";
export { rsvpEvent } from "./actions/rsvp-event";
export { getEvents, type EventWithDetails } from "./queries/get-events";
export { getEvent, type EventDetail } from "./queries/get-event";
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/social/index.ts
git commit -m "feat: update social barrel export with event types"
```

---

## Task 9: UI Components — Event Card, Event Form, RSVP Button

**Files:**
- Create: `src/domains/social/components/event-card.tsx`
- Create: `src/domains/social/components/event-form.tsx`
- Create: `src/domains/social/components/rsvp-button.tsx`

- [ ] **Step 1: Create event card component**

Create `src/domains/social/components/event-card.tsx`:

```typescript
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Calendar, MapPin, Users } from "lucide-react";
import type { EventWithDetails } from "../queries/get-events";

interface EventCardProps {
  event: EventWithDetails;
}

export function EventCard({ event }: EventCardProps) {
  const t = useTranslations("event");

  const typeLabels: Record<string, string> = {
    MARKET: t("typeMarket"),
    OPEN_DAY: t("typeOpenDay"),
    MEETUP: t("typeMeetup"),
    OTHER: t("typeOther"),
  };

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Link href={`/social/events/${event.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base line-clamp-1">
              {event.title}
            </CardTitle>
            <Badge variant="secondary">{typeLabels[event.type]}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatDate(event.startDate)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {event.goingCount} {t("goingCount")}
            </span>
            {event.interestedCount > 0 && (
              <span>
                {event.interestedCount} {t("interestedCount")}
              </span>
            )}
          </div>
          {event.groupName && (
            <Badge variant="outline" className="text-[10px]">
              {event.groupName}
            </Badge>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create RSVP button component**

Create `src/domains/social/components/rsvp-button.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Check, Star, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { rsvpEvent } from "../actions/rsvp-event";

interface RsvpButtonProps {
  eventId: string;
  currentStatus: string | null;
}

export function RsvpButton({ eventId, currentStatus }: RsvpButtonProps) {
  const t = useTranslations("event");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRsvp(status: "GOING" | "INTERESTED" | "NOT_GOING") {
    startTransition(async () => {
      await rsvpEvent({ eventId, status });
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button
        variant={currentStatus === "GOING" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("GOING")}
        disabled={isPending}
        className={cn("gap-1", currentStatus === "GOING" && "bg-green-600 hover:bg-green-700")}
      >
        <Check className="h-3.5 w-3.5" />
        {t("going")}
      </Button>
      <Button
        variant={currentStatus === "INTERESTED" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("INTERESTED")}
        disabled={isPending}
        className={cn("gap-1", currentStatus === "INTERESTED" && "bg-yellow-600 hover:bg-yellow-700")}
      >
        <Star className="h-3.5 w-3.5" />
        {t("interested")}
      </Button>
      <Button
        variant={currentStatus === "NOT_GOING" ? "default" : "outline"}
        size="sm"
        onClick={() => handleRsvp("NOT_GOING")}
        disabled={isPending}
        className="gap-1"
      >
        <X className="h-3.5 w-3.5" />
        {t("notGoing")}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Create event form component**

Create `src/domains/social/components/event-form.tsx`:

```typescript
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
import { createEvent } from "../actions/create-event";

interface EventFormProps {
  groupId?: string;
}

export function EventForm({ groupId }: EventFormProps) {
  const t = useTranslations("event");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("MEETUP");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recurrence, setRecurrence] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await createEvent({
        title: title.trim(),
        description: description.trim(),
        type: type as "MARKET" | "OPEN_DAY" | "MEETUP" | "OTHER",
        groupId,
        location: location.trim() || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        recurrence: recurrence
          ? (recurrence as "WEEKLY" | "BIWEEKLY" | "MONTHLY")
          : undefined,
      });

      if (result.success) {
        router.push(`/social/events/${result.eventId}`);
      } else if (result.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("eventTitle")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t("eventDescription")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("eventType")}</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MARKET">{t("typeMarket")}</SelectItem>
            <SelectItem value="OPEN_DAY">{t("typeOpenDay")}</SelectItem>
            <SelectItem value="MEETUP">{t("typeMeetup")}</SelectItem>
            <SelectItem value="OTHER">{t("typeOther")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">{t("address")}</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={300}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">{t("startDate")}</Label>
          <Input
            id="startDate"
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">{t("endDate")}</Label>
          <Input
            id="endDate"
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("recurrence")}</Label>
        <Select value={recurrence} onValueChange={setRecurrence}>
          <SelectTrigger>
            <SelectValue placeholder={t("recurrenceNone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("recurrenceNone")}</SelectItem>
            <SelectItem value="WEEKLY">{t("recurrenceWeekly")}</SelectItem>
            <SelectItem value="BIWEEKLY">
              {t("recurrenceBiweekly")}
            </SelectItem>
            <SelectItem value="MONTHLY">
              {t("recurrenceMonthly")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={isPending} className="w-full">
        {t("createEvent")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/social/components/event-card.tsx src/domains/social/components/event-form.tsx src/domains/social/components/rsvp-button.tsx
git commit -m "feat: add event card, event form, and RSVP button components"
```

---

## Task 10: UI Components — Event Calendar + Event Map

**Files:**
- Create: `src/domains/social/components/event-calendar.tsx`
- Create: `src/domains/social/components/event-map.tsx`

- [ ] **Step 1: Create event calendar component**

Create `src/domains/social/components/event-calendar.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Calendar } from "@/shared/ui/calendar";
import { EventCard } from "./event-card";
import type { EventWithDetails } from "../queries/get-events";

interface EventCalendarProps {
  events: EventWithDetails[];
}

export function EventCalendar({ events }: EventCalendarProps) {
  const t = useTranslations("event");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );

  // Dates that have events
  const eventDates = events.map((e) => {
    const d = new Date(e.startDate);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });

  // Events for selected date
  const selectedEvents = selectedDate
    ? events.filter((e) => {
        const d = new Date(e.startDate);
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      })
    : [];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={{ hasEvent: eventDates }}
          modifiersClassNames={{
            hasEvent: "bg-primary/20 font-bold",
          }}
        />
      </div>
      <div className="flex-1 space-y-3">
        {selectedDate && (
          <h3 className="font-medium">
            {selectedDate.toLocaleDateString("pl-PL", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </h3>
        )}
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
        ) : (
          selectedEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create event map component**

Create `src/domains/social/components/event-map.tsx`:

```typescript
"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { EventWithDetails } from "../queries/get-events";

// Dynamic import to avoid SSR issues with Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((m) => m.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

interface EventMapProps {
  events: EventWithDetails[];
}

export function EventMap({ events }: EventMapProps) {
  const t = useTranslations("event");

  const geoEvents = useMemo(
    () =>
      events.filter(
        (e) => e.latitude && e.longitude
      ),
    [events]
  );

  const typeLabels: Record<string, string> = {
    MARKET: t("typeMarket"),
    OPEN_DAY: t("typeOpenDay"),
    MEETUP: t("typeMeetup"),
    OTHER: t("typeOther"),
  };

  if (geoEvents.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {t("noEvents")}
      </p>
    );
  }

  // Center on Poland by default
  const center = geoEvents.length > 0
    ? {
        lat: parseFloat(geoEvents[0].latitude!),
        lng: parseFloat(geoEvents[0].longitude!),
      }
    : { lat: 52.0, lng: 19.0 };

  return (
    <div className="h-[500px] rounded-lg overflow-hidden border">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoEvents.map((event) => (
          <Marker
            key={event.id}
            position={[
              parseFloat(event.latitude!),
              parseFloat(event.longitude!),
            ]}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-medium text-sm">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {typeLabels[event.type]}
                </p>
                {event.location && (
                  <p className="text-xs">{event.location}</p>
                )}
                <p className="text-xs">
                  {new Date(event.startDate).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <a
                  href={`/social/events/${event.id}`}
                  className="text-xs text-primary underline"
                >
                  {t("events")}
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/domains/social/components/event-calendar.tsx src/domains/social/components/event-map.tsx
git commit -m "feat: add event calendar and map view components"
```

---

## Task 11: Pages — Events List, Create Event, Event Detail

**Files:**
- Create: `src/app/[locale]/(main)/social/events/page.tsx`
- Create: `src/app/[locale]/(main)/social/events/create/page.tsx`
- Create: `src/app/[locale]/(main)/social/events/[id]/page.tsx`

- [ ] **Step 1: Create events page with list/calendar/map tabs**

Create `src/app/[locale]/(main)/social/events/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getEvents } from "@/domains/social/queries/get-events";
import { EventsPageClient } from "./events-page-client";
import { Button } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function EventsPage() {
  const t = await getTranslations("event");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const events = await getEvents({ upcoming: true });

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("events")}</h1>
        <Button asChild>
          <Link href="/social/events/create">
            <Plus className="h-4 w-4 mr-2" />
            {t("createEvent")}
          </Link>
        </Button>
      </div>

      <EventsPageClient events={events} />
    </div>
  );
}
```

Create the client wrapper `src/app/[locale]/(main)/social/events/events-page-client.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { List, CalendarDays, Map } from "lucide-react";
import { EventCard } from "@/domains/social/components/event-card";
import { EventCalendar } from "@/domains/social/components/event-calendar";
import { EventMap } from "@/domains/social/components/event-map";
import type { EventWithDetails } from "@/domains/social/queries/get-events";

interface EventsPageClientProps {
  events: EventWithDetails[];
}

export function EventsPageClient({ events }: EventsPageClientProps) {
  const t = useTranslations("event");

  return (
    <Tabs defaultValue="list">
      <TabsList>
        <TabsTrigger value="list" className="gap-1">
          <List className="h-4 w-4" />
          {t("listView")}
        </TabsTrigger>
        <TabsTrigger value="calendar" className="gap-1">
          <CalendarDays className="h-4 w-4" />
          {t("calendarView")}
        </TabsTrigger>
        <TabsTrigger value="map" className="gap-1">
          <Map className="h-4 w-4" />
          {t("mapView")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="list" className="mt-4">
        {events.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            {t("noEvents")}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="calendar" className="mt-4">
        <EventCalendar events={events} />
      </TabsContent>

      <TabsContent value="map" className="mt-4">
        <EventMap events={events} />
      </TabsContent>
    </Tabs>
  );
}
```

- [ ] **Step 2: Create event creation page**

Create `src/app/[locale]/(main)/social/events/create/page.tsx`:

```typescript
import { getTranslations } from "next-intl/server";
import { EventForm } from "@/domains/social/components/event-form";

export default async function CreateEventPage() {
  const t = await getTranslations("event");

  return (
    <div className="max-w-lg mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">{t("createEvent")}</h1>
      <EventForm />
    </div>
  );
}
```

- [ ] **Step 3: Create event detail page**

Create `src/app/[locale]/(main)/social/events/[id]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getEvent } from "@/domains/social/queries/get-event";
import { RsvpButton } from "@/domains/social/components/rsvp-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import {
  Calendar,
  MapPin,
  Users,
  ArrowLeft,
  Trash2,
  Repeat,
} from "lucide-react";
import Link from "next/link";
import { deleteEvent } from "@/domains/social/actions/delete-event";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("event");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const event = await getEvent(id, session.user.id);

  if (!event) {
    notFound();
  }

  const typeLabels: Record<string, string> = {
    MARKET: t("typeMarket"),
    OPEN_DAY: t("typeOpenDay"),
    MEETUP: t("typeMeetup"),
    OTHER: t("typeOther"),
  };

  const recurrenceLabels: Record<string, string> = {
    WEEKLY: t("recurrenceWeekly"),
    BIWEEKLY: t("recurrenceBiweekly"),
    MONTHLY: t("recurrenceMonthly"),
  };

  const isCreator = event.creator.id === session.user.id;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/social/events">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("events")}
        </Link>
      </Button>

      <div className="border rounded-lg p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{typeLabels[event.type]}</Badge>
              {event.groupName && (
                <Badge variant="outline">{event.groupName}</Badge>
              )}
            </div>
          </div>
          {isCreator && (
            <form
              action={async () => {
                "use server";
                await deleteEvent(id);
              }}
            >
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>

        {event.description && (
          <p className="text-muted-foreground">{event.description}</p>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(event.startDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(event.endDate)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          {event.recurrence && (
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              <span>{recurrenceLabels[event.recurrence]}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>
            {event.goingCount} {t("goingCount")} · {event.interestedCount}{" "}
            {t("interestedCount")}
          </span>
        </div>

        <RsvpButton eventId={id} currentStatus={event.currentUserRsvp} />

        <Separator />

        <div>
          <h3 className="font-medium mb-3">{t("organizer")}</h3>
          <Link
            href={`/social/users/${event.creator.id}`}
            className="flex items-center gap-3"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={event.creator.avatar ?? undefined} />
              <AvatarFallback>
                {event.creator.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{event.creator.name}</span>
          </Link>
        </div>

        {event.attendees.length > 0 && (
          <div>
            <h3 className="font-medium mb-3">{t("attendees")}</h3>
            <div className="flex flex-wrap gap-2">
              {event.attendees
                .filter((a) => a.status === "GOING")
                .map((attendee) => (
                  <Link
                    key={attendee.id}
                    href={`/social/users/${attendee.id}`}
                  >
                    <Avatar className="h-8 w-8" title={attendee.name ?? ""}>
                      <AvatarImage src={attendee.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(attendee.name ?? "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/(main)/social/events/"
git commit -m "feat: add event pages — list with tabs, create, detail with RSVP"
```

---

## Task 12: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run linter**

Run: `npx eslint src/ --ext .ts,.tsx`
Expected: No errors (warnings OK).

- [ ] **Step 4: Fix any issues found in steps 1-3**

Fix TypeScript errors, lint issues, or failing tests as needed.

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: Build succeeds with all event routes listed:
- `/[locale]/social/events`
- `/[locale]/social/events/create`
- `/[locale]/social/events/[id]`

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any issues from Phase 5 verification"
```
