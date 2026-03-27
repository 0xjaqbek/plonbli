# Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the project foundation — Next.js app with auth, themes, i18n, database, user profiles, and PWA shell.

**Architecture:** Monolithic Next.js 15 (App Router) with domain-driven folder structure. PostgreSQL via Drizzle ORM. NextAuth v5 for authentication. Two themes via CSS variables. Polish-first i18n via next-intl.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL (Neon), NextAuth.js v5, next-intl, Zod, Vitest, React Testing Library, next-pwa

---

## File Structure

```
plonbli/
  .env.example
  .env.local                          # local secrets (gitignored)
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  drizzle.config.ts
  vitest.config.ts
  components.json                     # shadcn/ui config
  messages/
    pl.json                           # Polish translations
  public/
    manifest.json
    icons/
      icon-192.png
      icon-512.png
  src/
    app/
      layout.tsx                      # root layout (providers, fonts)
      globals.css                     # theme CSS variables + Tailwind
      (auth)/
        login/page.tsx
        register/page.tsx
        layout.tsx                    # auth layout (centered card)
      (main)/
        layout.tsx                    # main layout (nav, sidebar)
        page.tsx                      # home/redirect
        profile/page.tsx
    domains/
      auth/
        index.ts                      # barrel export
        schemas/validation.ts         # Zod schemas (register, login, profile)
        actions/register.ts           # server action
        actions/login.ts              # server action
        actions/update-profile.ts     # server action
        components/login-form.tsx
        components/register-form.tsx
        components/profile-form.tsx
        lib/auth-config.ts            # NextAuth config
        lib/auth.ts                   # NextAuth handlers + helpers
        lib/passwords.ts              # hash/verify
      geo/
        index.ts
        types.ts                      # location types, voivodeships enum
    shared/
      ui/
        theme-provider.tsx
        theme-toggle.tsx
        nav-bar.tsx
      db/
        index.ts                      # drizzle client
        schema/
          index.ts                    # re-exports all tables
          users.ts
          auth-accounts.ts
          sessions.ts
      lib/
        utils.ts                      # cn() helper etc.
        types.ts                      # shared types
    middleware.ts                      # i18n + auth middleware
    i18n/
      config.ts
      request.ts
  tests/
    setup.ts                          # vitest setup
    domains/
      auth/
        schemas/validation.test.ts
        actions/register.test.ts
        actions/login.test.ts
        actions/update-profile.test.ts
        lib/passwords.test.ts
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.example`, `.gitignore`

- [ ] **Step 1: Create Next.js project**

```bash
cd D:/plonbli
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

This will scaffold into the existing directory. Answer yes to overwrite if prompted.

- [ ] **Step 2: Verify project runs**

```bash
npm run dev
```

Expected: Dev server starts at http://localhost:3000 without errors. Stop it with Ctrl+C.

- [ ] **Step 3: Install core dependencies**

```bash
npm install drizzle-orm @neondatabase/serverless next-auth@beta next-intl @next/env zod bcryptjs
npm install -D drizzle-kit @types/bcryptjs vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 4: Create `.env.example`**

```env
# Database (Neon)
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require

# NextAuth
AUTH_SECRET=generate-with-npx-auth-secret
AUTH_URL=http://localhost:3000

# Google OAuth
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Facebook OAuth
AUTH_FACEBOOK_ID=
AUTH_FACEBOOK_SECRET=
```

- [ ] **Step 5: Create vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `tests/setup.ts`:

```typescript
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 6: Add test script to package.json**

Add to `"scripts"` in `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Clean up scaffolded files**

Remove default content from:
- `src/app/page.tsx` — replace with a simple placeholder:

```tsx
export default function Home() {
  return <div>plonbli</div>;
}
```

- `src/app/globals.css` — keep only the Tailwind directives:

```css
@import "tailwindcss";
```

- [ ] **Step 8: Create domain folder structure**

```bash
mkdir -p src/domains/auth/{schemas,actions,components,lib}
mkdir -p src/domains/geo
mkdir -p src/shared/{ui,db/schema,lib}
mkdir -p src/i18n
mkdir -p messages
mkdir -p tests/domains/auth/{schemas,actions,lib}
mkdir -p public/icons
```

- [ ] **Step 9: Create shared utils**

Create `src/shared/lib/utils.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```bash
npm install clsx tailwind-merge
```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with core dependencies and domain structure"
```

---

## Task 2: shadcn/ui + Theme System

**Files:**
- Create: `components.json`, `src/app/globals.css` (update), `src/shared/ui/theme-provider.tsx`, `src/shared/ui/theme-toggle.tsx`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

When prompted, select defaults. This creates `components.json` and updates `globals.css` with CSS variables.

- [ ] **Step 2: Move shadcn components path**

Edit `components.json` — change the aliases so components go to `src/shared/ui`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "stone",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/shared/ui",
    "utils": "@/shared/lib/utils",
    "ui": "@/shared/ui",
    "lib": "@/shared/lib",
    "hooks": "@/shared/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 3: Define light (earthy) theme CSS variables**

Replace the contents of `src/app/globals.css` with the two themes. The light theme uses warm earthy tones (stone, sage green, warm browns). The dark theme uses cool modern tones (slate, clean contrast).

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

/* Light theme: earthy, natural, warm */
:root {
  --radius: 0.625rem;
  --background: oklch(0.97 0.005 85);
  --foreground: oklch(0.25 0.02 60);
  --card: oklch(0.99 0.003 85);
  --card-foreground: oklch(0.25 0.02 60);
  --popover: oklch(0.99 0.003 85);
  --popover-foreground: oklch(0.25 0.02 60);
  --primary: oklch(0.45 0.1 145);
  --primary-foreground: oklch(0.98 0.005 145);
  --secondary: oklch(0.92 0.01 85);
  --secondary-foreground: oklch(0.35 0.02 60);
  --muted: oklch(0.93 0.008 85);
  --muted-foreground: oklch(0.55 0.015 60);
  --accent: oklch(0.88 0.04 90);
  --accent-foreground: oklch(0.30 0.02 60);
  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.98 0.005 25);
  --border: oklch(0.88 0.015 85);
  --input: oklch(0.88 0.015 85);
  --ring: oklch(0.45 0.1 145);
  --chart-1: oklch(0.55 0.12 145);
  --chart-2: oklch(0.60 0.10 85);
  --chart-3: oklch(0.50 0.08 200);
  --chart-4: oklch(0.65 0.15 95);
  --chart-5: oklch(0.55 0.10 30);
  --sidebar: oklch(0.95 0.008 85);
  --sidebar-foreground: oklch(0.35 0.02 60);
  --sidebar-primary: oklch(0.45 0.1 145);
  --sidebar-primary-foreground: oklch(0.98 0.005 145);
  --sidebar-accent: oklch(0.90 0.02 90);
  --sidebar-accent-foreground: oklch(0.30 0.02 60);
  --sidebar-border: oklch(0.88 0.015 85);
  --sidebar-ring: oklch(0.45 0.1 145);
}

/* Dark theme: modern, clean, cool */
.dark {
  --background: oklch(0.15 0.01 260);
  --foreground: oklch(0.93 0.005 260);
  --card: oklch(0.18 0.012 260);
  --card-foreground: oklch(0.93 0.005 260);
  --popover: oklch(0.18 0.012 260);
  --popover-foreground: oklch(0.93 0.005 260);
  --primary: oklch(0.65 0.15 155);
  --primary-foreground: oklch(0.15 0.01 155);
  --secondary: oklch(0.25 0.015 260);
  --secondary-foreground: oklch(0.85 0.005 260);
  --muted: oklch(0.25 0.012 260);
  --muted-foreground: oklch(0.60 0.01 260);
  --accent: oklch(0.28 0.02 260);
  --accent-foreground: oklch(0.90 0.005 260);
  --destructive: oklch(0.55 0.2 25);
  --destructive-foreground: oklch(0.98 0.005 25);
  --border: oklch(0.28 0.015 260);
  --input: oklch(0.28 0.015 260);
  --ring: oklch(0.65 0.15 155);
  --chart-1: oklch(0.65 0.15 155);
  --chart-2: oklch(0.60 0.12 260);
  --chart-3: oklch(0.70 0.10 200);
  --chart-4: oklch(0.65 0.15 95);
  --chart-5: oklch(0.60 0.12 30);
  --sidebar: oklch(0.17 0.012 260);
  --sidebar-foreground: oklch(0.85 0.005 260);
  --sidebar-primary: oklch(0.65 0.15 155);
  --sidebar-primary-foreground: oklch(0.15 0.01 155);
  --sidebar-accent: oklch(0.25 0.02 260);
  --sidebar-accent-foreground: oklch(0.90 0.005 260);
  --sidebar-border: oklch(0.28 0.015 260);
  --sidebar-ring: oklch(0.65 0.15 155);
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 4: Install next-themes and create theme provider**

```bash
npm install next-themes
```

Create `src/shared/ui/theme-provider.tsx`:

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 5: Install shadcn button and dropdown-menu components**

```bash
npx shadcn@latest add button dropdown-menu -y
```

- [ ] **Step 6: Create theme toggle component**

Create `src/shared/ui/theme-toggle.tsx`:

```tsx
"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Zmien motyw</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Jasny
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Ciemny
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          Systemowy
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 7: Wire theme provider into root layout**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "plonbli",
  description: "Platforma dla rolnikow i konsumentow",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Verify themes work**

```bash
npm run dev
```

Open http://localhost:3000. Page should render with earthy light theme. Open browser DevTools, add class `dark` to `<html>` — page should switch to dark modern theme. Stop dev server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui with earthy light and modern dark themes"
```

---

## Task 3: Database Schema & Connection

**Files:**
- Create: `drizzle.config.ts`, `src/shared/db/index.ts`, `src/shared/db/schema/users.ts`, `src/shared/db/schema/auth-accounts.ts`, `src/shared/db/schema/sessions.ts`, `src/shared/db/schema/index.ts`

- [ ] **Step 1: Create Drizzle config**

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 2: Create database client**

Create `src/shared/db/index.ts`:

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export type Database = typeof db;
```

- [ ] **Step 3: Create geo types**

Create `src/domains/geo/types.ts`:

```typescript
export const VOIVODESHIPS = [
  "dolnoslaskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "lodzkie",
  "malopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "slaskie",
  "swietokrzyskie",
  "warminsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export type Voivodeship = (typeof VOIVODESHIPS)[number];

export interface UserAddress {
  voivodeship: Voivodeship | null;
  county: string | null;
  commune: string | null;
  postalCode: string | null;
}
```

Create `src/domains/geo/index.ts`:

```typescript
export { VOIVODESHIPS, type Voivodeship, type UserAddress } from "./types";
```

- [ ] **Step 4: Create users table schema**

Create `src/shared/db/schema/users.ts`:

```typescript
import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  varchar,
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
  role: userRoleEnum("role").notNull().default("CONSUMER"),
  voivodeship: varchar("voivodeship", { length: 50 }),
  county: varchar("county", { length: 100 }),
  commune: varchar("commune", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  latitude: text("latitude"),
  longitude: text("longitude"),
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

```bash
npm install @paralleldrive/cuid2
```

- [ ] **Step 5: Create auth accounts table schema**

Create `src/shared/db/schema/auth-accounts.ts`:

```typescript
import { pgTable, text, varchar, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export const authAccounts = pgTable(
  "auth_accounts",
  {
    provider: varchar("provider", { length: 50 }).notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export type AuthAccount = typeof authAccounts.$inferSelect;
```

- [ ] **Step 6: Create sessions table schema (for NextAuth)**

Create `src/shared/db/schema/sessions.ts`:

```typescript
import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessions = pgTable("sessions", {
  sessionToken: varchar("session_token", { length: 255 })
    .primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  }
);

export type Session = typeof sessions.$inferSelect;
```

- [ ] **Step 7: Create schema barrel export**

Create `src/shared/db/schema/index.ts`:

```typescript
export { users, userRoleEnum, type User, type NewUser } from "./users";
export { authAccounts, type AuthAccount } from "./auth-accounts";
export {
  sessions,
  verificationTokens,
  type Session,
} from "./sessions";
```

- [ ] **Step 8: Add drizzle scripts to package.json**

Add to `"scripts"` in `package.json`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio"
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Drizzle ORM with user, auth account, and session schemas"
```

---

## Task 4: Authentication (NextAuth v5)

**Files:**
- Create: `src/domains/auth/lib/passwords.ts`, `src/domains/auth/lib/auth-config.ts`, `src/domains/auth/lib/auth.ts`, `src/domains/auth/index.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Test: `tests/domains/auth/lib/passwords.test.ts`

- [ ] **Step 1: Write failing test for password hashing**

Create `tests/domains/auth/lib/passwords.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/domains/auth/lib/passwords";

describe("passwords", () => {
  it("hashes a password and verifies it correctly", async () => {
    const password = "TestPassword123!";
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("CorrectPassword123!");
    expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
  });

  it("produces different hashes for same password", async () => {
    const password = "TestPassword123!";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/auth/lib/passwords.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement password helpers**

Create `src/domains/auth/lib/passwords.ts`:

```typescript
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/domains/auth/lib/passwords.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Create NextAuth config**

Create `src/domains/auth/lib/auth-config.ts`:

```typescript
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { verifyPassword } from "./passwords";
import { loginSchema } from "../schemas/validation";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
        };
      },
    }),
    Google,
    Facebook,
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};
```

- [ ] **Step 6: Create NextAuth handlers**

Create `src/domains/auth/lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import { authConfig } from "./auth-config";

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
```

- [ ] **Step 7: Create API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/domains/auth/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 8: Create auth barrel export**

Create `src/domains/auth/index.ts`:

```typescript
export { auth, signIn, signOut } from "./lib/auth";
export { hashPassword, verifyPassword } from "./lib/passwords";
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add NextAuth v5 with credentials, Google, and Facebook providers"
```

---

## Task 5: Validation Schemas (Zod)

**Files:**
- Create: `src/domains/auth/schemas/validation.ts`
- Test: `tests/domains/auth/schemas/validation.test.ts`

- [ ] **Step 1: Write failing tests for validation schemas**

Create `tests/domains/auth/schemas/validation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  profileSchema,
} from "@/domains/auth/schemas/validation";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      name: "Jan Kowalski",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "FARMER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      name: "Jan",
      email: "jan@example.com",
      password: "short",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("password");
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      name: "Jan",
      email: "not-an-email",
      password: "SecurePass123!",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("email");
  });

  it("rejects invalid role", () => {
    const result = registerSchema.safeParse({
      name: "Jan",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      name: "",
      email: "jan@example.com",
      password: "SecurePass123!",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "jan@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "jan@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("accepts valid profile update", () => {
    const result = profileSchema.safeParse({
      name: "Jan Kowalski",
      role: "BOTH",
      voivodeship: "malopolskie",
      postalCode: "30-001",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial update with optional fields", () => {
    const result = profileSchema.safeParse({
      name: "Jan Kowalski",
      role: "CONSUMER",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid voivodeship", () => {
    const result = profileSchema.safeParse({
      name: "Jan",
      role: "CONSUMER",
      voivodeship: "nonexistent",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid postal code format", () => {
    const result = profileSchema.safeParse({
      name: "Jan",
      role: "CONSUMER",
      postalCode: "12345",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/domains/auth/schemas/validation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement validation schemas**

Create `src/domains/auth/schemas/validation.ts`:

```typescript
import { z } from "zod";
import { VOIVODESHIPS } from "@/domains/geo";

export const registerSchema = z.object({
  name: z.string().min(1, "Imie jest wymagane").max(255),
  email: z.string().email("Nieprawidlowy adres email").max(255),
  password: z.string().min(8, "Haslo musi miec minimum 8 znakow").max(128),
  role: z.enum(["FARMER", "CONSUMER", "BOTH"]),
});

export const loginSchema = z.object({
  email: z.string().email("Nieprawidlowy adres email"),
  password: z.string().min(1, "Haslo jest wymagane"),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Imie jest wymagane").max(255),
  role: z.enum(["FARMER", "CONSUMER", "BOTH"]),
  voivodeship: z.enum(VOIVODESHIPS).nullable().optional(),
  county: z.string().max(100).nullable().optional(),
  commune: z.string().max(100).nullable().optional(),
  postalCode: z
    .string()
    .regex(/^\d{2}-\d{3}$/, "Nieprawidlowy kod pocztowy (format: XX-XXX)")
    .nullable()
    .optional(),
  latitude: z.string().nullable().optional(),
  longitude: z.string().nullable().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/domains/auth/schemas/validation.test.ts
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Zod validation schemas for register, login, and profile"
```

---

## Task 6: Registration Server Action

**Files:**
- Create: `src/domains/auth/actions/register.ts`
- Test: `tests/domains/auth/actions/register.test.ts`

- [ ] **Step 1: Write failing test for register action**

Create `tests/domains/auth/actions/register.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { register } from "@/domains/auth/actions/register";

vi.mock("@/shared/db", () => {
  const mockDb = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  };
  // Chain insert().values().returning()
  mockDb.insert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: mockDb.returning,
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
    expect(result.errors).toBeDefined();
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
    expect(result.errors?.email).toBeDefined();
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
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/auth/actions/register.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement register action**

Create `src/domains/auth/actions/register.ts`:

```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
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

  const { name, email, password, role } = parsed.data;

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

  return { success: true, userId: newUser.id };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/domains/auth/actions/register.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add register server action with validation and duplicate check"
```

---

## Task 7: Login Server Action

**Files:**
- Create: `src/domains/auth/actions/login.ts`
- Test: `tests/domains/auth/actions/login.test.ts`

- [ ] **Step 1: Write failing test for login action**

Create `tests/domains/auth/actions/login.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { login } from "@/domains/auth/actions/login";

vi.mock("@/domains/auth/lib/auth", () => ({
  signIn: vi.fn(),
}));

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid input", async () => {
    const result = await login({
      email: "bad",
      password: "",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("calls signIn with credentials on valid input", async () => {
    const { signIn } = await import("@/domains/auth/lib/auth");
    vi.mocked(signIn).mockResolvedValueOnce(undefined);

    const result = await login({
      email: "jan@example.com",
      password: "SecurePass123!",
    });

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "jan@example.com",
      password: "SecurePass123!",
      redirect: false,
    });
    expect(result.success).toBe(true);
  });

  it("returns error when signIn throws", async () => {
    const { signIn } = await import("@/domains/auth/lib/auth");
    vi.mocked(signIn).mockRejectedValueOnce(new Error("CredentialsSignin"));

    const result = await login({
      email: "jan@example.com",
      password: "WrongPassword!",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/auth/actions/login.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement login action**

Create `src/domains/auth/actions/login.ts`:

```typescript
"use server";

import { signIn } from "../lib/auth";
import { loginSchema, type LoginInput } from "../schemas/validation";

type LoginResult =
  | { success: true }
  | { success: false; error: string };

export async function login(input: LoginInput): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Nieprawidlowe dane logowania" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch {
    return { success: false, error: "Nieprawidlowy email lub haslo" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/domains/auth/actions/login.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add login server action with credentials signIn"
```

---

## Task 8: i18n Setup

**Files:**
- Create: `src/i18n/config.ts`, `src/i18n/request.ts`, `messages/pl.json`, `src/middleware.ts`

- [ ] **Step 1: Create i18n config**

Create `src/i18n/config.ts`:

```typescript
export const locales = ["pl"] as const;
export const defaultLocale = "pl" as const;

export type Locale = (typeof locales)[number];
```

- [ ] **Step 2: Create i18n request config**

Create `src/i18n/request.ts`:

```typescript
import { getRequestConfig } from "next-intl/server";
import { defaultLocale } from "./config";

export default getRequestConfig(async () => {
  const locale = defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 3: Create Polish translation file**

Create `messages/pl.json`:

```json
{
  "common": {
    "appName": "plonbli",
    "loading": "Ladowanie...",
    "save": "Zapisz",
    "cancel": "Anuluj",
    "delete": "Usun",
    "edit": "Edytuj",
    "back": "Wstecz",
    "search": "Szukaj",
    "error": "Cos poszlo nie tak"
  },
  "auth": {
    "login": "Zaloguj sie",
    "register": "Zarejestruj sie",
    "logout": "Wyloguj sie",
    "email": "Email",
    "password": "Haslo",
    "name": "Imie i nazwisko",
    "role": "Rola",
    "roleFarmer": "Rolnik",
    "roleConsumer": "Konsument",
    "roleBoth": "Rolnik i konsument",
    "noAccount": "Nie masz konta?",
    "hasAccount": "Masz juz konto?",
    "loginError": "Nieprawidlowy email lub haslo",
    "registerSuccess": "Konto utworzone. Zaloguj sie."
  },
  "profile": {
    "title": "Profil",
    "editProfile": "Edytuj profil",
    "location": "Lokalizacja",
    "voivodeship": "Wojewodztwo",
    "county": "Powiat",
    "commune": "Gmina",
    "postalCode": "Kod pocztowy",
    "useGps": "Uzyj GPS",
    "saved": "Profil zapisany"
  },
  "nav": {
    "home": "Strona glowna",
    "marketplace": "Rynek",
    "social": "Spolecznosc",
    "messages": "Wiadomosci",
    "profile": "Profil"
  },
  "theme": {
    "light": "Jasny",
    "dark": "Ciemny",
    "system": "Systemowy",
    "toggle": "Zmien motyw"
  }
}
```

- [ ] **Step 4: Create middleware for i18n**

Create `src/middleware.ts`:

```typescript
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n/config";

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "never",
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

- [ ] **Step 5: Add NextIntlClientProvider to root layout**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "@/shared/ui/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "plonbli",
  description: "Platforma dla rolnikow i konsumentow",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Add next-intl plugin to next.config**

Update `next.config.ts`:

```typescript
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
```

- [ ] **Step 7: Verify i18n works**

```bash
npm run dev
```

Open http://localhost:3000. No errors in console. Stop dev server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add next-intl i18n with Polish translations"
```

---

## Task 9: Auth UI — Register & Login Pages

**Files:**
- Create: `src/domains/auth/components/register-form.tsx`, `src/domains/auth/components/login-form.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Install shadcn form dependencies**

```bash
npx shadcn@latest add input label card select form separator -y
npm install react-hook-form @hookform/resolvers
```

- [ ] **Step 2: Create register form component**

Create `src/domains/auth/components/register-form.tsx`:

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

export function RegisterForm() {
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

- [ ] **Step 3: Create login form component**

Create `src/domains/auth/components/login-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "../schemas/validation";
import { login } from "../actions/login";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Separator } from "@/shared/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { signIn } from "next-auth/react";
import Link from "next/link";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginInput) {
    setError(null);
    startTransition(async () => {
      const result = await login(data);
      if (result.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-4">
      {registered && (
        <p className="text-sm text-primary text-center">
          {t("registerSuccess")}
        </p>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {t("login")}
          </Button>
        </form>
      </Form>

      <Separator />

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => signIn("facebook", { callbackUrl: "/" })}
        >
          Facebook
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-primary underline">
          {t("register")}
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Create auth layout**

Create `src/app/(auth)/layout.tsx`:

```tsx
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">plonbli</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 5: Create register page**

Create `src/app/(auth)/register/page.tsx`:

```tsx
import { RegisterForm } from "@/domains/auth/components/register-form";

export default function RegisterPage() {
  return <RegisterForm />;
}
```

- [ ] **Step 6: Create login page**

Create `src/app/(auth)/login/page.tsx`:

```tsx
import { Suspense } from "react";
import { LoginForm } from "@/domains/auth/components/login-form";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
```

The `Suspense` boundary is needed because `LoginForm` uses `useSearchParams`.

- [ ] **Step 7: Verify auth pages render**

```bash
npm run dev
```

Open http://localhost:3000/register — register form should render with name, email, password, role fields.
Open http://localhost:3000/login — login form should render with email, password, Google, Facebook buttons.
Both should respect theme. Stop dev server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add register and login pages with forms and social login buttons"
```

---

## Task 10: Profile Server Action

**Files:**
- Create: `src/domains/auth/actions/update-profile.ts`
- Test: `tests/domains/auth/actions/update-profile.test.ts`

- [ ] **Step 1: Write failing test for update profile action**

Create `tests/domains/auth/actions/update-profile.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateProfile } from "@/domains/auth/actions/update-profile";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/shared/db", () => {
  const mockDb = {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn(),
  };
  mockDb.update.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: mockDb.returning,
      }),
    }),
  });
  return { db: mockDb };
});

describe("updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const result = await updateProfile({
      name: "Jan",
      role: "CONSUMER",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Nie jestes zalogowany");
  });

  it("returns error for invalid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    const result = await updateProfile({
      name: "",
      role: "INVALID" as any,
    });
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it("updates profile on valid input", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);

    vi.mocked(
      db.update({} as any).set({} as any).where({} as any).returning
    ).mockResolvedValueOnce([{ id: "user-1" }] as any);

    const result = await updateProfile({
      name: "Jan Kowalski",
      role: "FARMER",
      voivodeship: "malopolskie",
      postalCode: "30-001",
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/domains/auth/actions/update-profile.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement update profile action**

Create `src/domains/auth/actions/update-profile.ts`:

```typescript
"use server";

import { eq } from "drizzle-orm";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { auth } from "../lib/auth";
import { profileSchema, type ProfileInput } from "../schemas/validation";

type UpdateProfileResult =
  | { success: true }
  | { success: false; error?: string; errors?: Record<string, string[]> };

export async function updateProfile(
  input: ProfileInput
): Promise<UpdateProfileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, role, voivodeship, county, commune, postalCode, latitude, longitude } =
    parsed.data;

  await db
    .update(users)
    .set({
      name,
      role,
      voivodeship: voivodeship ?? null,
      county: county ?? null,
      commune: commune ?? null,
      postalCode: postalCode ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/domains/auth/actions/update-profile.test.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add update-profile server action with location fields"
```

---

## Task 11: Profile Page & Main Layout

**Files:**
- Create: `src/domains/auth/components/profile-form.tsx`, `src/shared/ui/nav-bar.tsx`, `src/app/(main)/layout.tsx`, `src/app/(main)/profile/page.tsx`, `src/app/(main)/page.tsx`

- [ ] **Step 1: Create nav bar component**

Create `src/shared/ui/nav-bar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, ShoppingBasket, Users, MessageCircle, User } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { href: "/", icon: Home, labelKey: "home" as const },
  { href: "/marketplace", icon: ShoppingBasket, labelKey: "marketplace" as const },
  { href: "/social", icon: Users, labelKey: "social" as const },
  { href: "/messages", icon: MessageCircle, labelKey: "messages" as const },
  { href: "/profile", icon: User, labelKey: "profile" as const },
];

export function NavBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex items-center justify-between border-b px-6 py-3">
        <Link href="/" className="text-xl font-bold text-primary">
          plonbli
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                pathname === href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </header>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors",
                pathname === href
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {t(labelKey)}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
```

- [ ] **Step 2: Create main layout**

Create `src/app/(main)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { NavBar } from "@/shared/ui/nav-bar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="pb-20 md:pb-0">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create home page placeholder**

Create `src/app/(main)/page.tsx`:

```tsx
import { useTranslations } from "next-intl";

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <h1 className="text-2xl font-bold text-muted-foreground">plonbli</h1>
    </div>
  );
}
```

Update `src/app/page.tsx` (root) to redirect:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (session) {
    redirect("/");
  }
  redirect("/login");
}
```

Note: The root `page.tsx` acts as an entry point that redirects based on auth. The `(main)/page.tsx` is the authenticated home page.

Since both resolve to `/`, the route group `(main)` handles the authenticated view. Rename the root page to avoid conflict:

Delete `src/app/page.tsx` entirely. The `(main)/page.tsx` at `/` will be protected by the main layout, and unauthenticated users get redirected to `/login` by the layout.

- [ ] **Step 4: Create profile form component**

Create `src/domains/auth/components/profile-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileInput } from "../schemas/validation";
import { updateProfile } from "../actions/update-profile";
import { VOIVODESHIPS } from "@/domains/geo";
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
import type { User } from "@/shared/db/schema";

interface ProfileFormProps {
  user: User;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      role: user.role,
      voivodeship: user.voivodeship as ProfileInput["voivodeship"],
      county: user.county,
      commune: user.commune,
      postalCode: user.postalCode,
    },
  });

  function onSubmit(data: ProfileInput) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.success) {
        setMessage(t("saved"));
      }
    });
  }

  function handleGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      form.setValue("latitude", String(pos.coords.latitude));
      form.setValue("longitude", String(pos.coords.longitude));
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
              <FormLabel>{tAuth("name")}</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>{tAuth("role")}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CONSUMER">{tAuth("roleConsumer")}</SelectItem>
                  <SelectItem value="FARMER">{tAuth("roleFarmer")}</SelectItem>
                  <SelectItem value="BOTH">{tAuth("roleBoth")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <h3 className="text-lg font-medium">{t("location")}</h3>

        <FormField
          control={form.control}
          name="voivodeship"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("voivodeship")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value ?? undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("voivodeship")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {VOIVODESHIPS.map((v) => (
                    <SelectItem key={v} value={v}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="county"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("county")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="commune"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("commune")}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="postalCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("postalCode")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="XX-XXX"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="button" variant="outline" onClick={handleGps}>
          {t("useGps")}
        </Button>

        {message && <p className="text-sm text-primary">{message}</p>}

        <Button type="submit" className="w-full" disabled={isPending}>
          {t("editProfile")}
        </Button>
      </form>
    </Form>
  );
}
```

- [ ] **Step 5: Create profile page**

Create `src/app/(main)/profile/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { ProfileForm } from "@/domains/auth/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 6: Add logout button to profile page**

Update `src/app/(main)/profile/page.tsx` — add after the `ProfileForm` closing tag, inside `CardContent`:

```tsx
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users } from "@/shared/db/schema";
import { ProfileForm } from "@/domains/auth/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm user={user} />
          <Separator className="my-6" />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              className="text-sm text-destructive hover:underline"
            >
              Wyloguj sie
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 7: Verify main layout and profile render**

```bash
npm run dev
```

Navigate to http://localhost:3000 — should redirect to /login (no session). The navigation bar should not be visible on auth pages. Stop dev server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add main layout with nav bar and profile page with location fields"
```

---

## Task 12: PWA Configuration

**Files:**
- Create: `public/manifest.json`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:

```json
{
  "name": "plonbli",
  "short_name": "plonbli",
  "description": "Platforma dla rolnikow i konsumentow",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#f5f0eb",
  "theme_color": "#4a7c59",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Create placeholder icons**

Generate simple placeholder PNG icons (these will be replaced with real branding later):

```bash
npm install -D sharp
```

Create `scripts/generate-icons.ts`:

```typescript
import sharp from "sharp";

const sizes = [192, 512];

async function generate() {
  for (const size of sizes) {
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#4a7c59" rx="${size * 0.15}"/>
      <text x="50%" y="55%" font-size="${size * 0.3}" fill="white" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="bold">P</text>
    </svg>`;

    await sharp(Buffer.from(svg))
      .png()
      .toFile(`public/icons/icon-${size}.png`);
  }
  console.log("Icons generated");
}

generate();
```

```bash
npx tsx scripts/generate-icons.ts
```

- [ ] **Step 3: Add manifest link to root layout**

Update the `<head>` in `src/app/layout.tsx` by adding metadata:

```tsx
export const metadata: Metadata = {
  title: "plonbli",
  description: "Platforma dla rolnikow i konsumentow",
  manifest: "/manifest.json",
  themeColor: "#4a7c59",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "plonbli",
  },
};
```

- [ ] **Step 4: Verify PWA manifest loads**

```bash
npm run dev
```

Open http://localhost:3000. Open DevTools → Application → Manifest. Should show plonbli manifest with icons. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest with placeholder icons"
```

---

## Task 13: Run All Tests & Final Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (passwords: 3, validation: 10, register: 3, login: 3, update-profile: 3 = 22 tests total).

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

Expected: Build succeeds. Note: build may warn about missing DATABASE_URL — that's expected without .env.local configured.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve type and lint issues from final verification"
```

Only if there were fixes needed. If everything passed clean, skip this step.

---

## Summary

Phase 1 delivers:
- Next.js 15 project with domain-driven structure
- shadcn/ui with two themes (earthy light + modern dark)
- PostgreSQL schema (users, auth accounts, sessions)
- NextAuth v5 (email+password, Google, Facebook)
- i18n with Polish translations
- Registration, login, and profile management
- Responsive nav bar (desktop top + mobile bottom)
- PWA manifest with icons
- 22 unit tests covering validation, auth actions, and profile updates

Next: Phase 2 (Marketplace) — products, listings, categories, geolocation search.
