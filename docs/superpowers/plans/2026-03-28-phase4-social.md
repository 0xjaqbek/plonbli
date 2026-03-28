# Phase 4: Social — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a social layer with groups, posts, comments, reactions, and follow system so farmers and consumers can form communities and share updates.

**Architecture:** Extends the monolithic Next.js 15 app with a new `social` domain. Groups and posts stored in PostgreSQL via Drizzle. Feed is chronological (no algorithm) — query posts from followed users + joined groups. Groups have boards (posts scoped to group). Reactions are single-type (LIKE). Follow is user-to-user only.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL (Neon), Zod, next-intl, Vitest

---

## File Structure

```
src/
  domains/
    social/
      index.ts                              # barrel export
      schemas/validation.ts                 # Zod schemas
      actions/create-post.ts                # create post (feed or group)
      actions/delete-post.ts                # delete own post
      actions/toggle-reaction.ts            # like/unlike a post
      actions/add-comment.ts                # comment on a post
      actions/toggle-follow.ts              # follow/unfollow user
      actions/create-group.ts               # create a group
      actions/join-group.ts                 # join/leave group
      queries/get-feed.ts                   # chronological feed (followed + groups)
      queries/get-post.ts                   # single post with comments
      queries/get-groups.ts                 # list groups
      queries/get-group.ts                  # single group with members + posts
      queries/get-user-profile.ts           # user social profile (posts, followers)
      components/post-card.tsx              # post display with reactions/comments
      components/post-form.tsx              # create post form
      components/comment-list.tsx           # comments under a post
      components/comment-form.tsx           # add comment input
      components/group-card.tsx             # group card for list
      components/group-header.tsx           # group detail header
      components/user-follow-button.tsx     # follow/unfollow button
      components/feed-list.tsx              # feed with polling
  shared/
    db/schema/
      groups.ts                             # groups table + type/policy enums
      group-members.ts                      # group_members table
      posts.ts                              # posts table + type/visibility enums
      comments.ts                           # comments table
      reactions.ts                          # reactions table
      follows.ts                            # follows table
      relations.ts                          # updated with social relations
      index.ts                              # updated barrel export
  app/[locale]/(main)/
    social/
      page.tsx                              # main feed
      groups/
        page.tsx                            # groups list
        create/page.tsx                     # create group
        [id]/page.tsx                       # group detail + board
      posts/
        [id]/page.tsx                       # post detail with comments
      users/
        [id]/page.tsx                       # user social profile
messages/
  pl.json                                   # updated with social translations
tests/
  domains/
    social/
      schemas/validation.test.ts
      actions/create-post.test.ts
      actions/toggle-reaction.test.ts
```

---

## Task 1: Schema — Groups + Group Members

**Files:**
- Create: `src/shared/db/schema/groups.ts`
- Create: `src/shared/db/schema/group-members.ts`

- [ ] **Step 1: Create groups table schema**

Create `src/shared/db/schema/groups.ts`:

```typescript
import { pgTable, text, timestamp, pgEnum, varchar } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const groupTypeEnum = pgEnum("group_type", [
  "BUYING_GROUP",
  "COMMUNITY",
]);

export const joinPolicyEnum = pgEnum("join_policy", [
  "OPEN",
  "INVITE_ONLY",
]);

export const groups = pgTable("groups", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull().default(""),
  avatar: text("avatar"),
  type: groupTypeEnum("type").notNull(),
  joinPolicy: joinPolicyEnum("join_policy").notNull().default("OPEN"),
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  voivodeship: varchar("voivodeship", { length: 50 }),
  commune: varchar("commune", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
```

- [ ] **Step 2: Create group members table schema**

Create `src/shared/db/schema/group-members.ts`:

```typescript
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { groups } from "./groups";
import { users } from "./users";

export const groupMemberRoleEnum = pgEnum("group_member_role", [
  "ADMIN",
  "MEMBER",
]);

export const groupMembers = pgTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: groupMemberRoleEnum("role").notNull().default("MEMBER"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.groupId, table.userId] }),
  ]
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/db/schema/groups.ts src/shared/db/schema/group-members.ts
git commit -m "feat: add groups and group members schema"
```

---

## Task 2: Schema — Posts, Comments, Reactions, Follows

**Files:**
- Create: `src/shared/db/schema/posts.ts`
- Create: `src/shared/db/schema/comments.ts`
- Create: `src/shared/db/schema/reactions.ts`
- Create: `src/shared/db/schema/follows.ts`

- [ ] **Step 1: Create posts table schema**

Create `src/shared/db/schema/posts.ts`:

```typescript
import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { groups } from "./groups";

export const postTypeEnum = pgEnum("post_type", ["POST", "ANNOUNCEMENT"]);
export const postVisibilityEnum = pgEnum("post_visibility", [
  "PUBLIC",
  "GROUP",
  "FOLLOWERS",
]);

export const posts = pgTable("posts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }),
  content: text("content").notNull(),
  images: text("images").array().notNull().default([]),
  type: postTypeEnum("type").notNull().default("POST"),
  visibility: postVisibilityEnum("visibility").notNull().default("PUBLIC"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

- [ ] **Step 2: Create comments table schema**

Create `src/shared/db/schema/comments.ts`:

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { posts } from "./posts";
import { users } from "./users";

export const comments = pgTable("comments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  postId: text("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
```

- [ ] **Step 3: Create reactions table schema**

Create `src/shared/db/schema/reactions.ts`:

```typescript
import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { posts } from "./posts";
import { users } from "./users";

export const reactions = pgTable(
  "reactions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
  ]
);

export type Reaction = typeof reactions.$inferSelect;
```

- [ ] **Step 4: Create follows table schema**

Create `src/shared/db/schema/follows.ts`:

```typescript
import { pgTable, text, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: text("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followeeId] }),
  ]
);

export type Follow = typeof follows.$inferSelect;
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/db/schema/posts.ts src/shared/db/schema/comments.ts src/shared/db/schema/reactions.ts src/shared/db/schema/follows.ts
git commit -m "feat: add posts, comments, reactions, follows schema"
```

---

## Task 3: Update Relations + Barrel Export + Push Schema

**Files:**
- Modify: `src/shared/db/schema/relations.ts`
- Modify: `src/shared/db/schema/index.ts`

- [ ] **Step 1: Update relations with social relations**

Replace the full content of `src/shared/db/schema/relations.ts` with all existing + new relations:

```typescript
import { relations } from "drizzle-orm";
import { users } from "./users";
import { categories } from "./categories";
import { products } from "./products";
import { listings } from "./listings";
import { conversations } from "./conversations";
import { conversationMembers } from "./conversation-members";
import { messages } from "./messages";
import { groups } from "./groups";
import { groupMembers } from "./group-members";
import { posts } from "./posts";
import { comments } from "./comments";
import { reactions } from "./reactions";
import { follows } from "./follows";

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

export const conversationsRelations = relations(conversations, ({ many }) => ({
  members: many(conversationMembers),
  messages: many(messages),
}));

export const conversationMembersRelations = relations(
  conversationMembers,
  ({ one }) => ({
    conversation: one(conversations, {
      fields: [conversationMembers.conversationId],
      references: [conversations.id],
    }),
    user: one(users, {
      fields: [conversationMembers.userId],
      references: [users.id],
    }),
  })
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  creator: one(users, {
    fields: [groups.createdBy],
    references: [users.id],
  }),
  members: many(groupMembers),
  posts: many(posts),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, {
    fields: [groupMembers.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupMembers.userId],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [posts.groupId],
    references: [groups.id],
  }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
}));

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, {
    fields: [reactions.postId],
    references: [posts.id],
  }),
  user: one(users, {
    fields: [reactions.userId],
    references: [users.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  followee: one(users, {
    fields: [follows.followeeId],
    references: [users.id],
    relationName: "followee",
  }),
}));
```

- [ ] **Step 2: Update schema barrel export**

Add the new exports to `src/shared/db/schema/index.ts` — append after the existing messaging exports and before the relations export:

```typescript
// Add these exports after messages exports, before relations:
export {
  groups,
  groupTypeEnum,
  joinPolicyEnum,
  type Group,
  type NewGroup,
} from "./groups";
export {
  groupMembers,
  groupMemberRoleEnum,
  type GroupMember,
  type NewGroupMember,
} from "./group-members";
export {
  posts,
  postTypeEnum,
  postVisibilityEnum,
  type Post,
  type NewPost,
} from "./posts";
export { comments, type Comment, type NewComment } from "./comments";
export { reactions, type Reaction } from "./reactions";
export { follows, type Follow } from "./follows";

// Update the relations export to include all new relations:
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
} from "./relations";
```

- [ ] **Step 3: Push schema to database**

Run: `npx drizzle-kit push`
Expected: `Changes applied` with new tables created.

- [ ] **Step 4: Commit**

```bash
git add src/shared/db/schema/relations.ts src/shared/db/schema/index.ts
git commit -m "feat: update relations and barrel export with social tables"
```

---

## Task 4: Validation Schemas + Tests

**Files:**
- Create: `src/domains/social/schemas/validation.ts`
- Create: `tests/domains/social/schemas/validation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/domains/social/schemas/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  createPostSchema,
  addCommentSchema,
  createGroupSchema,
} from "@/domains/social/schemas/validation";

describe("createPostSchema", () => {
  it("accepts valid public post", () => {
    const result = createPostSchema.safeParse({
      content: "Swiezy zbiory pomidorow!",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(true);
  });

  it("accepts post with images", () => {
    const result = createPostSchema.safeParse({
      content: "Zdjecia z pola",
      images: ["https://example.com/1.jpg"],
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(true);
  });

  it("accepts group post", () => {
    const result = createPostSchema.safeParse({
      content: "Post w grupie",
      groupId: "group-1",
      visibility: "GROUP",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = createPostSchema.safeParse({
      content: "",
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 10 images", () => {
    const result = createPostSchema.safeParse({
      content: "Za duzo zdjec",
      images: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}.jpg`),
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(false);
  });

  it("rejects content over 5000 characters", () => {
    const result = createPostSchema.safeParse({
      content: "a".repeat(5001),
      visibility: "PUBLIC",
    });
    expect(result.success).toBe(false);
  });
});

describe("addCommentSchema", () => {
  it("accepts valid comment", () => {
    const result = addCommentSchema.safeParse({
      postId: "post-1",
      content: "Swietny post!",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty content", () => {
    const result = addCommentSchema.safeParse({
      postId: "post-1",
      content: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing postId", () => {
    const result = addCommentSchema.safeParse({
      content: "Komentarz",
    });
    expect(result.success).toBe(false);
  });
});

describe("createGroupSchema", () => {
  it("accepts valid group", () => {
    const result = createGroupSchema.safeParse({
      name: "Grupa zakupowa Krakow",
      type: "BUYING_GROUP",
      joinPolicy: "OPEN",
    });
    expect(result.success).toBe(true);
  });

  it("accepts group with description", () => {
    const result = createGroupSchema.safeParse({
      name: "Spolecznosc EKO",
      description: "Grupa dla milosnikow ekologicznych produktow",
      type: "COMMUNITY",
      joinPolicy: "INVITE_ONLY",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createGroupSchema.safeParse({
      name: "",
      type: "COMMUNITY",
      joinPolicy: "OPEN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createGroupSchema.safeParse({
      name: "Grupa",
      type: "INVALID",
      joinPolicy: "OPEN",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement validation schemas**

Create `src/domains/social/schemas/validation.ts`:

```typescript
import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().min(1, "Tresc jest wymagana").max(5000),
  images: z.array(z.string().url()).max(10).default([]),
  groupId: z.string().optional(),
  type: z.enum(["POST", "ANNOUNCEMENT"]).default("POST"),
  visibility: z.enum(["PUBLIC", "GROUP", "FOLLOWERS"]),
});

export const addCommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().min(1, "Komentarz nie moze byc pusty").max(2000),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(100),
  description: z.string().max(2000).default(""),
  type: z.enum(["BUYING_GROUP", "COMMUNITY"]),
  joinPolicy: z.enum(["OPEN", "INVITE_ONLY"]).default("OPEN"),
  voivodeship: z.string().optional(),
  commune: z.string().optional(),
});

export type CreatePostInput = z.input<typeof createPostSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type CreateGroupInput = z.input<typeof createGroupSchema>;
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/domains/social/schemas/validation.test.ts`
Expected: all 13 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/domains/social/schemas/validation.ts tests/domains/social/schemas/validation.test.ts
git commit -m "feat: add social Zod validation schemas with tests"
```

---

## Task 5: i18n — Social Translations

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Add social translations**

Add the following sections to `messages/pl.json` after the `"messaging"` block (before the closing `}`):

```json
  "social": {
    "feed": "Aktualnosci",
    "newPost": "Nowy post",
    "writePost": "Co slychac?",
    "publish": "Opublikuj",
    "noPosts": "Brak postow. Zaobserwuj uzytkownikow lub dolacz do grup!",
    "like": "Lubie to",
    "liked": "Polubione",
    "likes": "polubien",
    "comment": "Komentarz",
    "comments": "Komentarze",
    "addComment": "Dodaj komentarz...",
    "noComments": "Brak komentarzy",
    "share": "Udostepnij",
    "delete": "Usun",
    "confirmDelete": "Na pewno chcesz usunac ten post?",
    "postDeleted": "Post usuniety",
    "visibility": "Widocznosc",
    "visibilityPublic": "Publiczny",
    "visibilityGroup": "Grupa",
    "visibilityFollowers": "Obserwujacy",
    "announcement": "Ogloszenie",
    "follow": "Obserwuj",
    "unfollow": "Przestan obserwowac",
    "followers": "Obserwujacy",
    "following": "Obserwowani",
    "posts": "Posty"
  },
  "group": {
    "groups": "Grupy",
    "createGroup": "Utworz grupe",
    "groupName": "Nazwa grupy",
    "groupDescription": "Opis grupy",
    "groupType": "Typ grupy",
    "typeBuyingGroup": "Grupa zakupowa",
    "typeCommunity": "Spolecznosc",
    "joinPolicy": "Dolaczanie",
    "policyOpen": "Otwarte",
    "policyInviteOnly": "Tylko z zaproszeniem",
    "join": "Dolacz",
    "leave": "Opusc grupe",
    "members": "Czlonkowie",
    "noGroups": "Brak grup. Utworz pierwsza grupe!",
    "groupBoard": "Tablica grupy",
    "myGroups": "Moje grupy",
    "allGroups": "Wszystkie grupy",
    "created": "Grupa utworzona"
  }
```

- [ ] **Step 2: Commit**

```bash
git add messages/pl.json
git commit -m "feat: add social and group i18n translations (Polish)"
```

---

## Task 6: Server Actions — Create/Delete Post + Tests

**Files:**
- Create: `src/domains/social/actions/create-post.ts`
- Create: `src/domains/social/actions/delete-post.ts`
- Create: `tests/domains/social/actions/create-post.test.ts`

- [ ] **Step 1: Write failing tests for create post**

Create `tests/domains/social/actions/create-post.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPost } from "@/domains/social/actions/create-post";

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

describe("createPost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await createPost({
      content: "Test post",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Nie jestes zalogowany");
    }
  });

  it("returns error for empty content", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await createPost({
      content: "",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(false);
  });

  it("creates post on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    const mockReturning = vi.fn().mockResolvedValueOnce([{ id: "post-1" }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await createPost({
      content: "Swiezy zbiory!",
      visibility: "PUBLIC",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.postId).toBe("post-1");
    }
  });

  it("returns error for group post when not a member", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.groupMembers.findFirst).mockResolvedValueOnce(undefined);

    const result = await createPost({
      content: "Post w grupie",
      groupId: "group-1",
      visibility: "GROUP",
    });

    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Implement create post action**

Create `src/domains/social/actions/create-post.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { posts, groupMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createPostSchema,
  type CreatePostInput,
} from "../schemas/validation";

type CreatePostResult =
  | { success: true; postId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createPost(
  input: CreatePostInput
): Promise<CreatePostResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { content, images, groupId, type, visibility } = parsed.data;

  // If posting to a group, verify membership
  if (groupId) {
    const membership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, session.user.id)
      ),
    });

    if (!membership) {
      return { success: false, error: "Nie jestes czlonkiem tej grupy" };
    }
  }

  const [post] = await db
    .insert(posts)
    .values({
      authorId: session.user.id,
      groupId: groupId ?? null,
      content,
      images,
      type,
      visibility: groupId ? "GROUP" : visibility,
    })
    .returning({ id: posts.id });

  return { success: true, postId: post.id };
}
```

- [ ] **Step 3: Implement delete post action**

Create `src/domains/social/actions/delete-post.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { posts } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type DeletePostResult =
  | { success: true }
  | { success: false; error: string };

export async function deletePost(
  postId: string
): Promise<DeletePostResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const post = await db.query.posts.findFirst({
    where: eq(posts.id, postId),
  });

  if (!post) {
    return { success: false, error: "Post nie istnieje" };
  }

  if (post.authorId !== session.user.id) {
    return { success: false, error: "Mozesz usuwac tylko swoje posty" };
  }

  await db.delete(posts).where(eq(posts.id, postId));

  return { success: true };
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/domains/social/actions/create-post.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domains/social/actions/create-post.ts src/domains/social/actions/delete-post.ts tests/domains/social/actions/create-post.test.ts
git commit -m "feat: add create and delete post server actions with tests"
```

---

## Task 7: Server Actions — Reactions, Comments, Follow, Group

**Files:**
- Create: `src/domains/social/actions/toggle-reaction.ts`
- Create: `src/domains/social/actions/add-comment.ts`
- Create: `src/domains/social/actions/toggle-follow.ts`
- Create: `src/domains/social/actions/create-group.ts`
- Create: `src/domains/social/actions/join-group.ts`
- Create: `tests/domains/social/actions/toggle-reaction.test.ts`

- [ ] **Step 1: Write failing test for toggle reaction**

Create `tests/domains/social/actions/toggle-reaction.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toggleReaction } from "@/domains/social/actions/toggle-reaction";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockReturnValue({
          returning: vi.fn(),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn(),
    }),
    query: {
      reactions: { findFirst: vi.fn() },
    },
  };
  return { db: mockDb };
});

describe("toggleReaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(auth).mockResolvedValueOnce(null as any);

    const result = await toggleReaction("post-1");

    expect(result.success).toBe(false);
  });

  it("adds reaction when not liked", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.reactions.findFirst).mockResolvedValueOnce(undefined);

    const mockReturning = vi.fn().mockResolvedValueOnce([{ postId: "post-1" }]);
    const mockOnConflict = vi.fn().mockReturnValue({ returning: mockReturning });
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(db.insert).mockReturnValueOnce({ values: mockValues } as any);

    const result = await toggleReaction("post-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.liked).toBe(true);
    }
  });

  it("removes reaction when already liked", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1", email: "a@b.com", name: "A" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const { db } = await import("@/shared/db");
    vi.mocked(db.query.reactions.findFirst).mockResolvedValueOnce({
      postId: "post-1",
      userId: "user-1",
      createdAt: new Date(),
    });

    vi.mocked(db.delete).mockReturnValueOnce({
      where: vi.fn().mockResolvedValueOnce(undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const result = await toggleReaction("post-1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.liked).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Implement toggle reaction**

Create `src/domains/social/actions/toggle-reaction.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { reactions } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type ToggleReactionResult =
  | { success: true; liked: boolean }
  | { success: false; error: string };

export async function toggleReaction(
  postId: string
): Promise<ToggleReactionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const existing = await db.query.reactions.findFirst({
    where: and(
      eq(reactions.postId, postId),
      eq(reactions.userId, session.user.id)
    ),
  });

  if (existing) {
    await db
      .delete(reactions)
      .where(
        and(
          eq(reactions.postId, postId),
          eq(reactions.userId, session.user.id)
        )
      );
    return { success: true, liked: false };
  }

  await db.insert(reactions).values({
    postId,
    userId: session.user.id,
  });

  return { success: true, liked: true };
}
```

- [ ] **Step 3: Implement add comment**

Create `src/domains/social/actions/add-comment.ts`:

```typescript
"use server";

import { db } from "@/shared/db";
import { comments } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  addCommentSchema,
  type AddCommentInput,
} from "../schemas/validation";

type AddCommentResult =
  | { success: true; commentId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function addComment(
  input: AddCommentInput
): Promise<AddCommentResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = addCommentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { postId, content } = parsed.data;

  const [comment] = await db
    .insert(comments)
    .values({
      postId,
      authorId: session.user.id,
      content,
    })
    .returning({ id: comments.id });

  return { success: true, commentId: comment.id };
}
```

- [ ] **Step 4: Implement toggle follow**

Create `src/domains/social/actions/toggle-follow.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { follows } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type ToggleFollowResult =
  | { success: true; following: boolean }
  | { success: false; error: string };

export async function toggleFollow(
  targetUserId: string
): Promise<ToggleFollowResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  if (session.user.id === targetUserId) {
    return { success: false, error: "Nie mozesz obserwowac samego siebie" };
  }

  const existing = await db.query.follows.findFirst({
    where: and(
      eq(follows.followerId, session.user.id),
      eq(follows.followeeId, targetUserId)
    ),
  });

  if (existing) {
    await db
      .delete(follows)
      .where(
        and(
          eq(follows.followerId, session.user.id),
          eq(follows.followeeId, targetUserId)
        )
      );
    return { success: true, following: false };
  }

  await db.insert(follows).values({
    followerId: session.user.id,
    followeeId: targetUserId,
  });

  return { success: true, following: true };
}
```

- [ ] **Step 5: Implement create group**

Create `src/domains/social/actions/create-group.ts`:

```typescript
"use server";

import { db } from "@/shared/db";
import { groups, groupMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";
import {
  createGroupSchema,
  type CreateGroupInput,
} from "../schemas/validation";

type CreateGroupResult =
  | { success: true; groupId: string }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function createGroup(
  input: CreateGroupInput
): Promise<CreateGroupResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = createGroupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, description, type, joinPolicy, voivodeship, commune } =
    parsed.data;

  const [group] = await db
    .insert(groups)
    .values({
      name,
      description,
      type,
      joinPolicy,
      createdBy: session.user.id,
      voivodeship: voivodeship ?? null,
      commune: commune ?? null,
    })
    .returning({ id: groups.id });

  // Add creator as admin member
  await db.insert(groupMembers).values({
    groupId: group.id,
    userId: session.user.id,
    role: "ADMIN",
  });

  return { success: true, groupId: group.id };
}
```

- [ ] **Step 6: Implement join/leave group**

Create `src/domains/social/actions/join-group.ts`:

```typescript
"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { groups, groupMembers } from "@/shared/db/schema";
import { auth } from "@/domains/auth/lib/auth";

type JoinGroupResult =
  | { success: true; joined: boolean }
  | { success: false; error: string };

export async function joinGroup(
  groupId: string
): Promise<JoinGroupResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  if (!group) {
    return { success: false, error: "Grupa nie istnieje" };
  }

  const existing = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, session.user.id)
    ),
  });

  if (existing) {
    // Leave group (but not if admin/creator)
    if (existing.role === "ADMIN") {
      return { success: false, error: "Admin nie moze opuscic grupy" };
    }
    await db
      .delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, session.user.id)
        )
      );
    return { success: true, joined: false };
  }

  if (group.joinPolicy === "INVITE_ONLY") {
    return { success: false, error: "Grupa wymaga zaproszenia" };
  }

  await db.insert(groupMembers).values({
    groupId,
    userId: session.user.id,
    role: "MEMBER",
  });

  return { success: true, joined: true };
}
```

- [ ] **Step 7: Run tests**

Run: `npx vitest run tests/domains/social/`
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/domains/social/actions/ tests/domains/social/actions/toggle-reaction.test.ts
git commit -m "feat: add social actions — reactions, comments, follow, groups"
```

---

## Task 8: Queries — Feed, Post, Groups, User Profile

**Files:**
- Create: `src/domains/social/queries/get-feed.ts`
- Create: `src/domains/social/queries/get-post.ts`
- Create: `src/domains/social/queries/get-groups.ts`
- Create: `src/domains/social/queries/get-group.ts`
- Create: `src/domains/social/queries/get-user-profile.ts`

- [ ] **Step 1: Create get-feed query**

Create `src/domains/social/queries/get-feed.ts`:

```typescript
import { eq, desc, or, inArray, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  posts,
  users,
  groups,
  follows,
  groupMembers,
  reactions,
  comments,
} from "@/shared/db/schema";

const POSTS_PER_PAGE = 20;

export async function getFeed(userId: string, page = 1) {
  // Get IDs of users we follow
  const followedUsers = await db
    .select({ id: follows.followeeId })
    .from(follows)
    .where(eq(follows.followerId, userId));

  const followedIds = followedUsers.map((f) => f.id);

  // Get IDs of groups we're in
  const myGroups = await db
    .select({ id: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const groupIds = myGroups.map((g) => g.id);

  // Build feed conditions: own posts + followed users' public/followers posts + group posts
  const conditions = [];

  // Own posts
  conditions.push(eq(posts.authorId, userId));

  // Followed users' posts (PUBLIC or FOLLOWERS visibility)
  if (followedIds.length > 0) {
    conditions.push(
      and(
        inArray(posts.authorId, followedIds),
        or(
          eq(posts.visibility, "PUBLIC"),
          eq(posts.visibility, "FOLLOWERS")
        )
      )!
    );
  }

  // Group posts
  if (groupIds.length > 0) {
    conditions.push(
      and(
        inArray(posts.groupId, groupIds),
        eq(posts.visibility, "GROUP")
      )!
    );
  }

  // Also include all PUBLIC posts (global feed)
  conditions.push(eq(posts.visibility, "PUBLIC"));

  const offset = (page - 1) * POSTS_PER_PAGE;

  const feedPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      images: posts.images,
      type: posts.type,
      visibility: posts.visibility,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      groupId: posts.groupId,
      groupName: groups.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(groups, eq(posts.groupId, groups.id))
    .where(or(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(POSTS_PER_PAGE)
    .offset(offset);

  // Get reaction counts and comment counts for each post
  const postIds = feedPosts.map((p) => p.id);

  const enriched = await Promise.all(
    feedPosts.map(async (post) => {
      const [{ count: reactionCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(reactions)
        .where(eq(reactions.postId, post.id));

      const [{ count: commentCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(comments)
        .where(eq(comments.postId, post.id));

      // Check if current user liked this post
      const userReaction = await db.query.reactions.findFirst({
        where: and(
          eq(reactions.postId, post.id),
          eq(reactions.userId, userId)
        ),
      });

      return {
        ...post,
        reactionCount,
        commentCount,
        liked: !!userReaction,
      };
    })
  );

  return enriched;
}

export type FeedPost = Awaited<ReturnType<typeof getFeed>>[number];
```

- [ ] **Step 2: Create get-post query**

Create `src/domains/social/queries/get-post.ts`:

```typescript
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  posts,
  users,
  groups,
  comments,
  reactions,
} from "@/shared/db/schema";

export async function getPost(postId: string, currentUserId?: string) {
  const [post] = await db
    .select({
      id: posts.id,
      content: posts.content,
      images: posts.images,
      type: posts.type,
      visibility: posts.visibility,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
      groupId: posts.groupId,
      groupName: groups.name,
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .leftJoin(groups, eq(posts.groupId, groups.id))
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) return null;

  // Get comments
  const postComments = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.postId, postId))
    .orderBy(desc(comments.createdAt));

  // Get reaction count
  const [{ count: reactionCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(reactions)
    .where(eq(reactions.postId, postId));

  // Check if current user liked
  let liked = false;
  if (currentUserId) {
    const userReaction = await db.query.reactions.findFirst({
      where: and(
        eq(reactions.postId, postId),
        eq(reactions.userId, currentUserId)
      ),
    });
    liked = !!userReaction;
  }

  return {
    ...post,
    comments: postComments,
    reactionCount,
    commentCount: postComments.length,
    liked,
  };
}

export type PostDetail = NonNullable<Awaited<ReturnType<typeof getPost>>>;
export type PostComment = PostDetail["comments"][number];
```

- [ ] **Step 3: Create get-groups query**

Create `src/domains/social/queries/get-groups.ts`:

```typescript
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/shared/db";
import { groups, groupMembers, users } from "@/shared/db/schema";

export async function getGroups(currentUserId?: string) {
  const allGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      avatar: groups.avatar,
      type: groups.type,
      joinPolicy: groups.joinPolicy,
      voivodeship: groups.voivodeship,
      createdAt: groups.createdAt,
      creator: {
        id: users.id,
        name: users.name,
      },
    })
    .from(groups)
    .innerJoin(users, eq(groups.createdBy, users.id))
    .orderBy(desc(groups.createdAt));

  const enriched = await Promise.all(
    allGroups.map(async (group) => {
      const [{ count: memberCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(groupMembers)
        .where(eq(groupMembers.groupId, group.id));

      let isMember = false;
      if (currentUserId) {
        const membership = await db.query.groupMembers.findFirst({
          where: eq(groupMembers.groupId, group.id),
        });
        // Check specifically for current user
        const userMembership = await db.query.groupMembers.findFirst({
          where: (gm, { and, eq }) =>
            and(
              eq(gm.groupId, group.id),
              eq(gm.userId, currentUserId)
            ),
        });
        isMember = !!userMembership;
      }

      return {
        ...group,
        memberCount,
        isMember,
      };
    })
  );

  return enriched;
}

export type GroupWithDetails = Awaited<ReturnType<typeof getGroups>>[number];
```

- [ ] **Step 4: Create get-group query**

Create `src/domains/social/queries/get-group.ts`:

```typescript
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  groups,
  groupMembers,
  users,
  posts,
  reactions,
  comments,
} from "@/shared/db/schema";

export async function getGroup(groupId: string, currentUserId?: string) {
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
  });

  if (!group) return null;

  // Get creator
  const creator = await db.query.users.findFirst({
    where: eq(users.id, group.createdBy),
  });

  // Get members
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      avatar: users.avatar,
      role: groupMembers.role,
      joinedAt: groupMembers.joinedAt,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  // Get group posts
  const groupPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      images: posts.images,
      type: posts.type,
      visibility: posts.visibility,
      createdAt: posts.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      },
    })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.groupId, groupId))
    .orderBy(desc(posts.createdAt))
    .limit(50);

  // Enrich posts with counts
  const enrichedPosts = await Promise.all(
    groupPosts.map(async (post) => {
      const [{ count: reactionCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(reactions)
        .where(eq(reactions.postId, post.id));

      const [{ count: commentCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(comments)
        .where(eq(comments.postId, post.id));

      let liked = false;
      if (currentUserId) {
        const userReaction = await db.query.reactions.findFirst({
          where: and(
            eq(reactions.postId, post.id),
            eq(reactions.userId, currentUserId)
          ),
        });
        liked = !!userReaction;
      }

      return { ...post, reactionCount, commentCount, liked, groupId: null, groupName: null };
    })
  );

  const isMember = members.some((m) => m.id === currentUserId);

  return {
    ...group,
    creator: creator
      ? { id: creator.id, name: creator.name, avatar: creator.avatar }
      : null,
    members,
    memberCount: members.length,
    posts: enrichedPosts,
    isMember,
  };
}

export type GroupDetail = NonNullable<Awaited<ReturnType<typeof getGroup>>>;
```

- [ ] **Step 5: Create get-user-profile query**

Create `src/domains/social/queries/get-user-profile.ts`:

```typescript
import { eq, desc, sql, and } from "drizzle-orm";
import { db } from "@/shared/db";
import {
  users,
  posts,
  follows,
  reactions,
  comments,
} from "@/shared/db/schema";

export async function getUserProfile(
  userId: string,
  currentUserId?: string
) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return null;

  // Get follower/following counts
  const [{ count: followerCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(follows)
    .where(eq(follows.followeeId, userId));

  const [{ count: followingCount }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(follows)
    .where(eq(follows.followerId, userId));

  // Check if current user follows this user
  let isFollowing = false;
  if (currentUserId && currentUserId !== userId) {
    const follow = await db.query.follows.findFirst({
      where: and(
        eq(follows.followerId, currentUserId),
        eq(follows.followeeId, userId)
      ),
    });
    isFollowing = !!follow;
  }

  // Get user's public posts
  const userPosts = await db
    .select({
      id: posts.id,
      content: posts.content,
      images: posts.images,
      type: posts.type,
      visibility: posts.visibility,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(
      and(eq(posts.authorId, userId), eq(posts.visibility, "PUBLIC"))
    )
    .orderBy(desc(posts.createdAt))
    .limit(20);

  const enrichedPosts = await Promise.all(
    userPosts.map(async (post) => {
      const [{ count: reactionCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(reactions)
        .where(eq(reactions.postId, post.id));

      const [{ count: commentCount }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(comments)
        .where(eq(comments.postId, post.id));

      let liked = false;
      if (currentUserId) {
        const userReaction = await db.query.reactions.findFirst({
          where: and(
            eq(reactions.postId, post.id),
            eq(reactions.userId, currentUserId)
          ),
        });
        liked = !!userReaction;
      }

      return {
        ...post,
        reactionCount,
        commentCount,
        liked,
        author: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
        },
        groupId: null,
        groupName: null,
      };
    })
  );

  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    role: user.role,
    voivodeship: user.voivodeship,
    commune: user.commune,
    createdAt: user.createdAt,
    followerCount,
    followingCount,
    isFollowing,
    posts: enrichedPosts,
  };
}

export type UserProfile = NonNullable<
  Awaited<ReturnType<typeof getUserProfile>>
>;
```

- [ ] **Step 6: Commit**

```bash
git add src/domains/social/queries/
git commit -m "feat: add social queries — feed, post detail, groups, user profile"
```

---

## Task 9: Barrel Export

**Files:**
- Create: `src/domains/social/index.ts`

- [ ] **Step 1: Create barrel export**

Create `src/domains/social/index.ts`:

```typescript
export {
  createPostSchema,
  addCommentSchema,
  createGroupSchema,
  type CreatePostInput,
  type AddCommentInput,
  type CreateGroupInput,
} from "./schemas/validation";
export { createPost } from "./actions/create-post";
export { deletePost } from "./actions/delete-post";
export { toggleReaction } from "./actions/toggle-reaction";
export { addComment } from "./actions/add-comment";
export { toggleFollow } from "./actions/toggle-follow";
export { createGroup } from "./actions/create-group";
export { joinGroup } from "./actions/join-group";
export { getFeed, type FeedPost } from "./queries/get-feed";
export { getPost, type PostDetail, type PostComment } from "./queries/get-post";
export { getGroups, type GroupWithDetails } from "./queries/get-groups";
export { getGroup, type GroupDetail } from "./queries/get-group";
export {
  getUserProfile,
  type UserProfile,
} from "./queries/get-user-profile";
```

- [ ] **Step 2: Commit**

```bash
git add src/domains/social/index.ts
git commit -m "feat: add social domain barrel export"
```

---

## Task 10: UI Components — Post Card, Post Form, Comments

**Files:**
- Create: `src/domains/social/components/post-card.tsx`
- Create: `src/domains/social/components/post-form.tsx`
- Create: `src/domains/social/components/comment-list.tsx`
- Create: `src/domains/social/components/comment-form.tsx`

- [ ] **Step 1: Create post card component**

Create `src/domains/social/components/post-card.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { toggleReaction } from "../actions/toggle-reaction";
import { deletePost } from "../actions/delete-post";
import type { FeedPost } from "../queries/get-feed";

interface PostCardProps {
  post: FeedPost;
  currentUserId: string;
  onDeleted?: () => void;
}

export function PostCard({ post, currentUserId, onDeleted }: PostCardProps) {
  const t = useTranslations("social");
  const [isPending, startTransition] = useTransition();

  const initials = post.author.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function handleLike() {
    startTransition(async () => {
      await toggleReaction(post.id);
    });
  }

  function handleDelete() {
    if (!confirm(t("confirmDelete"))) return;
    startTransition(async () => {
      const result = await deletePost(post.id);
      if (result.success && onDeleted) onDeleted();
    });
  }

  function formatTime(date: Date) {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return `${Math.max(1, Math.floor(diff / (1000 * 60)))} min`;
    if (hours < 24) return `${hours}h`;
    return new Date(date).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "short",
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <Link
          href={`/social/users/${post.author.id}`}
          className="flex items-center gap-3"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={post.author.avatar ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{post.author.name}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatTime(post.createdAt)}
              </span>
              {post.groupName && (
                <Badge variant="outline" className="text-[10px]">
                  {post.groupName}
                </Badge>
              )}
            </div>
          </div>
        </Link>

        {post.author.id === currentUserId && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Link href={`/social/posts/${post.id}`}>
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
      </Link>

      <div className="flex items-center gap-4 pt-1">
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1", post.liked && "text-red-500")}
          onClick={handleLike}
          disabled={isPending}
        >
          <Heart
            className={cn("h-4 w-4", post.liked && "fill-current")}
          />
          <span className="text-xs">{post.reactionCount}</span>
        </Button>

        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link href={`/social/posts/${post.id}`}>
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{post.commentCount}</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create post form component**

Create `src/domains/social/components/post-form.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { createPost } from "../actions/create-post";

interface PostFormProps {
  groupId?: string;
}

export function PostForm({ groupId }: PostFormProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await createPost({
        content: content.trim(),
        visibility: groupId ? "GROUP" : "PUBLIC",
        groupId,
      });

      if (result.success) {
        setContent("");
        router.refresh();
      }
    });
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t("writePost")}
        rows={3}
      />
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isPending || !content.trim()}
          size="sm"
        >
          {t("publish")}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create comment list and form components**

Create `src/domains/social/components/comment-list.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import Link from "next/link";
import type { PostComment } from "../queries/get-post";

interface CommentListProps {
  comments: PostComment[];
}

export function CommentList({ comments }: CommentListProps) {
  const t = useTranslations("social");

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t("noComments")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => {
        const initials = comment.author.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <div key={comment.id} className="flex gap-3">
            <Link href={`/social/users/${comment.author.id}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.author.avatar ?? undefined} />
                <AvatarFallback className="text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <div className="bg-muted rounded-lg px-3 py-2">
                <p className="text-xs font-medium">
                  {comment.author.name}
                </p>
                <p className="text-sm">{comment.content}</p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                {new Date(comment.createdAt).toLocaleString("pl-PL", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

Create `src/domains/social/components/comment-form.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Send } from "lucide-react";
import { addComment } from "../actions/add-comment";

interface CommentFormProps {
  postId: string;
}

export function CommentForm({ postId }: CommentFormProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!content.trim()) return;

    startTransition(async () => {
      const result = await addComment({
        postId,
        content: content.trim(),
      });

      if (result.success) {
        setContent("");
        router.refresh();
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex gap-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("addComment")}
        disabled={isPending}
      />
      <Button
        size="icon"
        onClick={handleSubmit}
        disabled={isPending || !content.trim()}
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/domains/social/components/post-card.tsx src/domains/social/components/post-form.tsx src/domains/social/components/comment-list.tsx src/domains/social/components/comment-form.tsx
git commit -m "feat: add post card, post form, comment list and form components"
```

---

## Task 11: UI Components — Group Card, Group Header, Follow Button, Feed List

**Files:**
- Create: `src/domains/social/components/group-card.tsx`
- Create: `src/domains/social/components/group-header.tsx`
- Create: `src/domains/social/components/user-follow-button.tsx`
- Create: `src/domains/social/components/feed-list.tsx`

- [ ] **Step 1: Create group card component**

Create `src/domains/social/components/group-card.tsx`:

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
import { Users } from "lucide-react";
import type { GroupWithDetails } from "../queries/get-groups";

interface GroupCardProps {
  group: GroupWithDetails;
}

export function GroupCard({ group }: GroupCardProps) {
  const t = useTranslations("group");

  return (
    <Link href={`/social/groups/${group.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{group.name}</CardTitle>
            <Badge variant="secondary">
              {group.type === "BUYING_GROUP"
                ? t("typeBuyingGroup")
                : t("typeCommunity")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {group.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {group.description}
            </p>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>
              {group.memberCount} {t("members")}
            </span>
            {group.isMember && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {t("members")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Create group header component**

Create `src/domains/social/components/group-header.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Users, MapPin } from "lucide-react";
import { joinGroup } from "../actions/join-group";
import type { GroupDetail } from "../queries/get-group";

interface GroupHeaderProps {
  group: GroupDetail;
  currentUserId: string;
}

export function GroupHeader({ group, currentUserId }: GroupHeaderProps) {
  const t = useTranslations("group");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isCreator = group.creator?.id === currentUserId;

  function handleJoinLeave() {
    startTransition(async () => {
      await joinGroup(group.id);
      router.refresh();
    });
  }

  return (
    <div className="border rounded-lg p-6 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary">
              {group.type === "BUYING_GROUP"
                ? t("typeBuyingGroup")
                : t("typeCommunity")}
            </Badge>
            <Badge variant="outline">
              {group.joinPolicy === "OPEN"
                ? t("policyOpen")
                : t("policyInviteOnly")}
            </Badge>
          </div>
        </div>

        {!isCreator && (
          <Button
            variant={group.isMember ? "outline" : "default"}
            onClick={handleJoinLeave}
            disabled={isPending}
          >
            {group.isMember ? t("leave") : t("join")}
          </Button>
        )}
      </div>

      {group.description && (
        <p className="text-muted-foreground">{group.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          {group.memberCount} {t("members")}
        </span>
        {group.voivodeship && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {group.voivodeship}
          </span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create user follow button**

Create `src/domains/social/components/user-follow-button.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/ui/button";
import { toggleFollow } from "../actions/toggle-follow";

interface UserFollowButtonProps {
  targetUserId: string;
  isFollowing: boolean;
}

export function UserFollowButton({
  targetUserId,
  isFollowing,
}: UserFollowButtonProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleFollow(targetUserId);
      router.refresh();
    });
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isPending}
      size="sm"
    >
      {isFollowing ? t("unfollow") : t("follow")}
    </Button>
  );
}
```

- [ ] **Step 4: Create feed list component**

Create `src/domains/social/components/feed-list.tsx`:

```typescript
"use client";

import { useTranslations } from "next-intl";
import { PostCard } from "./post-card";
import type { FeedPost } from "../queries/get-feed";

interface FeedListProps {
  posts: FeedPost[];
  currentUserId: string;
}

export function FeedList({ posts, currentUserId }: FeedListProps) {
  const t = useTranslations("social");

  if (posts.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        {t("noPosts")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/domains/social/components/group-card.tsx src/domains/social/components/group-header.tsx src/domains/social/components/user-follow-button.tsx src/domains/social/components/feed-list.tsx
git commit -m "feat: add group card, group header, follow button, feed list components"
```

---

## Task 12: Pages — Feed, Post Detail, Groups, User Profile

**Files:**
- Create: `src/app/[locale]/(main)/social/page.tsx`
- Create: `src/app/[locale]/(main)/social/posts/[id]/page.tsx`
- Create: `src/app/[locale]/(main)/social/groups/page.tsx`
- Create: `src/app/[locale]/(main)/social/groups/create/page.tsx`
- Create: `src/app/[locale]/(main)/social/groups/[id]/page.tsx`
- Create: `src/app/[locale]/(main)/social/users/[id]/page.tsx`

- [ ] **Step 1: Create feed page**

Create `src/app/[locale]/(main)/social/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getFeed } from "@/domains/social/queries/get-feed";
import { PostForm } from "@/domains/social/components/post-form";
import { FeedList } from "@/domains/social/components/feed-list";

export default async function SocialFeedPage() {
  const t = await getTranslations("social");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const posts = await getFeed(session.user.id);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("feed")}</h1>
      <PostForm />
      <FeedList posts={posts} currentUserId={session.user.id} />
    </div>
  );
}
```

- [ ] **Step 2: Create post detail page**

Create `src/app/[locale]/(main)/social/posts/[id]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { getPost } from "@/domains/social/queries/get-post";
import { PostCard } from "@/domains/social/components/post-card";
import { CommentList } from "@/domains/social/components/comment-list";
import { CommentForm } from "@/domains/social/components/comment-form";
import { Separator } from "@/shared/ui/separator";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const post = await getPost(id, session.user.id);

  if (!post) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <PostCard
        post={post}
        currentUserId={session.user.id}
      />
      <Separator />
      <CommentForm postId={id} />
      <CommentList comments={post.comments} />
    </div>
  );
}
```

- [ ] **Step 3: Create groups list page**

Create `src/app/[locale]/(main)/social/groups/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getGroups } from "@/domains/social/queries/get-groups";
import { GroupCard } from "@/domains/social/components/group-card";
import { Button } from "@/shared/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function GroupsPage() {
  const t = await getTranslations("group");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const allGroups = await getGroups(session.user.id);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("groups")}</h1>
        <Button asChild>
          <Link href="/social/groups/create">
            <Plus className="h-4 w-4 mr-2" />
            {t("createGroup")}
          </Link>
        </Button>
      </div>

      {allGroups.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {t("noGroups")}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allGroups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create group creation page**

Create `src/app/[locale]/(main)/social/groups/create/page.tsx`:

```typescript
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { createGroupSchema, type CreateGroupInput } from "@/domains/social/schemas/validation";
import { createGroup } from "@/domains/social/actions/create-group";

export default function CreateGroupPage() {
  const t = useTranslations("group");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateGroupInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createGroupSchema) as any,
    defaultValues: {
      name: "",
      description: "",
      type: "COMMUNITY",
      joinPolicy: "OPEN",
    },
  });

  function onSubmit(data: CreateGroupInput) {
    startTransition(async () => {
      const result = await createGroup(data);
      if (result.success) {
        router.push(`/social/groups/${result.groupId}`);
      }
    });
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">{t("createGroup")}</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("groupName")}</FormLabel>
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
                <FormLabel>{t("groupDescription")}</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("groupType")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="COMMUNITY">
                      {t("typeCommunity")}
                    </SelectItem>
                    <SelectItem value="BUYING_GROUP">
                      {t("typeBuyingGroup")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="joinPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("joinPolicy")}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="OPEN">
                      {t("policyOpen")}
                    </SelectItem>
                    <SelectItem value="INVITE_ONLY">
                      {t("policyInviteOnly")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isPending}>
            {t("createGroup")}
          </Button>
        </form>
      </Form>
    </div>
  );
}
```

- [ ] **Step 5: Create group detail page**

Create `src/app/[locale]/(main)/social/groups/[id]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getGroup } from "@/domains/social/queries/get-group";
import { GroupHeader } from "@/domains/social/components/group-header";
import { PostForm } from "@/domains/social/components/post-form";
import { FeedList } from "@/domains/social/components/feed-list";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("group");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const group = await getGroup(id, session.user.id);

  if (!group) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <GroupHeader group={group} currentUserId={session.user.id} />

      {group.isMember && (
        <>
          <h2 className="text-lg font-bold">{t("groupBoard")}</h2>
          <PostForm groupId={id} />
          <FeedList
            posts={group.posts}
            currentUserId={session.user.id}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Create user social profile page**

Create `src/app/[locale]/(main)/social/users/[id]/page.tsx`:

```typescript
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import { getUserProfile } from "@/domains/social/queries/get-user-profile";
import { UserFollowButton } from "@/domains/social/components/user-follow-button";
import { FeedList } from "@/domains/social/components/feed-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { MapPin, Calendar } from "lucide-react";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("social");
  const tAuth = await getTranslations("auth");
  const tFarmer = await getTranslations("farmer");
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const profile = await getUserProfile(id, session.user.id);

  if (!profile) {
    notFound();
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isOwnProfile = session.user.id === id;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile.avatar ?? undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold">{profile.name}</h1>
              <Badge variant="secondary">
                {profile.role === "FARMER"
                  ? tAuth("roleFarmer")
                  : profile.role === "BOTH"
                    ? tAuth("roleBoth")
                    : tAuth("roleConsumer")}
              </Badge>
            </div>
          </div>

          {!isOwnProfile && (
            <UserFollowButton
              targetUserId={id}
              isFollowing={profile.isFollowing}
            />
          )}
        </div>

        <div className="flex items-center gap-6 mt-4 text-sm">
          <span>
            <strong>{profile.followerCount}</strong>{" "}
            <span className="text-muted-foreground">{t("followers")}</span>
          </span>
          <span>
            <strong>{profile.followingCount}</strong>{" "}
            <span className="text-muted-foreground">{t("following")}</span>
          </span>
        </div>

        {profile.voivodeship && (
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
            <MapPin className="h-3 w-3" />
            {profile.voivodeship}
            {profile.commune ? `, ${profile.commune}` : ""}
          </p>
        )}
        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
          <Calendar className="h-3 w-3" />
          {tFarmer("memberSince")}{" "}
          {new Date(profile.createdAt).toLocaleDateString("pl-PL", {
            year: "numeric",
            month: "long",
          })}
        </p>
      </div>

      <h2 className="text-lg font-bold">{t("posts")}</h2>
      <FeedList posts={profile.posts} currentUserId={session.user.id} />
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/(main)/social/"
git commit -m "feat: add social pages — feed, post detail, groups, user profile"
```

---

## Task 13: Final Verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Run linter**

Run: `npx eslint src/ --ext .ts,.tsx`
Expected: No errors.

- [ ] **Step 4: Fix any issues found in steps 1-3**

Fix TypeScript errors, lint issues, or failing tests as needed.

- [ ] **Step 5: Verify build**

Run: `npx next build`
Expected: Build succeeds with all social routes listed.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve any issues from Phase 4 verification"
```
