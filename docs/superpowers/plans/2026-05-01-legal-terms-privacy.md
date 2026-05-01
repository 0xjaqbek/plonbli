# Legal — Regulamin, Polityka Prywatności, Prawa RODO — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodanie dostępu do dokumentów prawnych w stopce auth i profilu, checkboxa akceptacji na rejestracji oraz pełnej implementacji praw RODO (eksport + anonimizacja konta).

**Architecture:** Strony `/(legal)/terms` i `/(legal)/privacy` już istnieją. Plan dodaje: (1) stopkę z linkami w auth layout, (2) wymagany checkbox w RegisterForm z walidacją Zod, (3) nową kartę "Prawa i dokumenty" w profilu z Server Action anonimizacji i API route eksportu.

**Tech Stack:** Next.js 15 App Router, Drizzle ORM, NextAuth v5, shadcn/ui, Zod, Vitest, next-intl

---

## Mapa plików

| Plik | Akcja |
|------|-------|
| `src/shared/ui/checkbox.tsx` | Nowy — shadcn Checkbox |
| `src/shared/ui/alert-dialog.tsx` | Nowy — shadcn AlertDialog |
| `messages/pl.json` | Modyfikacja — nowe klucze i18n |
| `src/domains/auth/schemas/validation.ts` | Modyfikacja — dodanie `acceptTerms` do `registerSchema` |
| `tests/domains/auth/schemas/validation.test.ts` | Modyfikacja — testy dla `acceptTerms` |
| `src/domains/auth/actions/delete-account.ts` | Nowy — Server Action anonimizacji |
| `tests/domains/auth/actions/delete-account.test.ts` | Nowy — testy anonimizacji |
| `src/domains/auth/index.ts` | Modyfikacja — export `deleteAccount` |
| `src/app/[locale]/(auth)/layout.tsx` | Modyfikacja — stopka z linkami prawnymi |
| `src/domains/auth/components/register-form.tsx` | Modyfikacja — checkbox akceptacji |
| `src/app/api/user/export/route.ts` | Nowy — API route eksportu danych |
| `src/app/[locale]/(main)/profile/delete-account-dialog.tsx` | Nowy — client component dialogu |
| `src/app/[locale]/(main)/profile/page.tsx` | Modyfikacja — nowa karta "Prawa i dokumenty" |

---

## Task 1: Zainstaluj shadcn Checkbox i AlertDialog

**Files:**
- Create: `src/shared/ui/checkbox.tsx`
- Create: `src/shared/ui/alert-dialog.tsx`

- [ ] **Step 1: Dodaj komponenty shadcn**

```bash
npx shadcn@latest add checkbox alert-dialog
```

Expected: komponenty pojawiają się w `src/shared/ui/checkbox.tsx` i `src/shared/ui/alert-dialog.tsx`

- [ ] **Step 2: Zweryfikuj instalację**

```bash
ls src/shared/ui/checkbox.tsx src/shared/ui/alert-dialog.tsx
```

Expected: obydwa pliki istnieją

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/checkbox.tsx src/shared/ui/alert-dialog.tsx
git commit -m "feat(ui): add Checkbox and AlertDialog shadcn components"
```

---

## Task 2: Dodaj klucze i18n

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1: Dodaj klucze do namespace `auth`**

W `messages/pl.json`, znajdź sekcję `"auth": {` i dodaj na końcu (przed zamykającym `}`):

```json
"acceptTermsPrefix": "Akceptuję",
"acceptTermsAnd": "i",
"acceptTermsTerms": "Regulamin",
"acceptTermsPrivacy": "Politykę Prywatności",
"acceptTermsError": "Musisz zaakceptować regulamin i politykę prywatności",
"termsLink": "Regulamin",
"privacyLink": "Polityka prywatności"
```

- [ ] **Step 2: Dodaj klucze do namespace `profile`**

Znajdź sekcję `"profile": {` i dodaj nowe klucze:

```json
"legalSection": "Prawa i dokumenty",
"documents": "Dokumenty",
"yourData": "Twoje dane",
"downloadData": "Pobierz swoje dane",
"dangerZone": "Strefa niebezpieczna",
"deleteAccount": "Usuń konto",
"deleteAccountDialogTitle": "Usuń konto",
"deleteAccountDialogDescription": "Ta operacja jest nieodwracalna. Twoje dane osobowe zostaną usunięte. Treści, które opublikowałeś, pozostaną na platformie jako \"Użytkownik usunięty\".",
"deleteAccountConfirmLabel": "Wpisz swój adres email, aby potwierdzić",
"deleteAccountConfirmButton": "Usuń konto na zawsze",
"deleteAccountCancel": "Anuluj",
"deleteAccountError": "Podany email nie zgadza się z Twoim adresem email"
```

- [ ] **Step 3: Sprawdź poprawność JSON**

```bash
node -e "JSON.parse(require('fs').readFileSync('messages/pl.json','utf8')); console.log('JSON valid')"
```

Expected: `JSON valid`

- [ ] **Step 4: Commit**

```bash
git add messages/pl.json
git commit -m "feat(i18n): add legal section and acceptTerms translation keys"
```

---

## Task 3: Dodaj `acceptTerms` do `registerSchema` + testy

**Files:**
- Modify: `src/domains/auth/schemas/validation.ts`
- Modify: `tests/domains/auth/schemas/validation.test.ts`

- [ ] **Step 1: Napisz failing test**

W `tests/domains/auth/schemas/validation.test.ts` dodaj do bloku `describe("registerSchema", ...)`:

```typescript
it("rejects missing acceptTerms", () => {
  const result = registerSchema.safeParse({
    name: "Jan Kowalski",
    email: "jan@example.com",
    password: "SecurePass123!",
    role: "FARMER",
  });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0].path).toContain("acceptTerms");
});

it("rejects acceptTerms = false", () => {
  const result = registerSchema.safeParse({
    name: "Jan Kowalski",
    email: "jan@example.com",
    password: "SecurePass123!",
    role: "FARMER",
    acceptTerms: false,
  });
  expect(result.success).toBe(false);
  expect(result.error?.issues[0].path).toContain("acceptTerms");
});

it("accepts acceptTerms = true", () => {
  const result = registerSchema.safeParse({
    name: "Jan Kowalski",
    email: "jan@example.com",
    password: "SecurePass123!",
    role: "FARMER",
    acceptTerms: true,
  });
  expect(result.success).toBe(true);
});
```

Uwaga: istniejący test `"accepts valid registration data"` nie ma `acceptTerms` — **zaktualizuj go**:

```typescript
it("accepts valid registration data", () => {
  const result = registerSchema.safeParse({
    name: "Jan Kowalski",
    email: "jan@example.com",
    password: "SecurePass123!",
    role: "FARMER",
    acceptTerms: true,
  });
  expect(result.success).toBe(true);
});
```

- [ ] **Step 2: Uruchom test — sprawdź że failuje**

```bash
npx vitest run tests/domains/auth/schemas/validation.test.ts
```

Expected: FAIL na nowych testach (`acceptTerms` nie istnieje w schemacie)

- [ ] **Step 3: Dodaj `acceptTerms` do `registerSchema`**

W `src/domains/auth/schemas/validation.ts` zmień `registerSchema`:

```typescript
export const registerSchema = z.object({
  name: z.string().min(1, "Imie jest wymagane").max(255),
  email: z.string().email("Nieprawidlowy adres email").max(255),
  password: z.string().min(8, "Haslo musi miec minimum 8 znakow").max(128),
  role: z.enum(["FARMER", "CONSUMER", "BOTH"]),
  inviteCode: z.string().optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Musisz zaakceptowac regulamin i polityke prywatnosci" }),
  }),
});
```

- [ ] **Step 4: Uruchom testy — sprawdź że przechodzą**

```bash
npx vitest run tests/domains/auth/schemas/validation.test.ts
```

Expected: wszystkie testy PASS

- [ ] **Step 5: Sprawdź że register action nadal działa (nie przyjmuje acceptTerms)**

Server Action `register` nie musi przyjmować `acceptTerms` — walidacja dzieje się tylko po stronie klienta w formularzu. Schema jest używana w `register-form.tsx` przez react-hook-form, a server action waliduje własnym wywołaniem `registerSchema.safeParse()`.

Otwórz `src/domains/auth/actions/register.ts` i sprawdź czy wywołuje `registerSchema.safeParse()`. Jeśli tak — action zacznie wymagać `acceptTerms`. Dodaj `acceptTerms: true` do wywołania w teście `register.test.ts`:

W `tests/domains/auth/actions/register.test.ts` zaktualizuj wszystkie wywołania `register({...})` dodając `acceptTerms: true`:

```typescript
// Przykład — dodaj acceptTerms: true do każdego wywołania register()
const result = await register({
  name: "Jan Kowalski",
  email: "jan@example.com",
  password: "SecurePass123!",
  role: "FARMER",
  acceptTerms: true,
});
```

- [ ] **Step 6: Uruchom wszystkie testy auth**

```bash
npx vitest run tests/domains/auth/
```

Expected: wszystkie PASS

- [ ] **Step 7: Commit**

```bash
git add src/domains/auth/schemas/validation.ts tests/domains/auth/schemas/validation.test.ts tests/domains/auth/actions/register.test.ts
git commit -m "feat(auth): add acceptTerms field to registerSchema with Zod validation"
```

---

## Task 4: Dodaj stopkę z linkami prawnymi do auth layout

**Files:**
- Modify: `src/app/[locale]/(auth)/layout.tsx`

- [ ] **Step 1: Zmodyfikuj auth layout**

Zastąp zawartość `src/app/[locale]/(auth)/layout.tsx`:

```typescript
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">plonbli</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        <Link href="/terms" className="hover:underline">
          {t("termsLink")}
        </Link>
        {" · "}
        <Link href="/privacy" className="hover:underline">
          {t("privacyLink")}
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak błędów związanych z tym plikiem

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/\(auth\)/layout.tsx
git commit -m "feat(auth): add legal footer links to auth layout"
```

---

## Task 5: Dodaj checkbox akceptacji do RegisterForm

**Files:**
- Modify: `src/domains/auth/components/register-form.tsx`

- [ ] **Step 1: Zmodyfikuj RegisterForm**

Zastąp zawartość `src/domains/auth/components/register-form.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { registerSchema, type RegisterInput } from "../schemas/validation";
import { register } from "../actions/register";
import { trackEvent, EVENTS } from "@/domains/analytics";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Checkbox } from "@/shared/ui/checkbox";
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
      acceptTerms: undefined,
    },
  });

  function onSubmit(data: RegisterInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await register(data);
      if (result.success) {
        trackEvent(EVENTS.AUTH_REGISTERED, { method: "email" });
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

        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="font-normal text-sm cursor-pointer">
                  {t("acceptTermsPrefix")}{" "}
                  <Link href="/terms" className="text-primary underline">
                    {t("acceptTermsTerms")}
                  </Link>{" "}
                  {t("acceptTermsAnd")}{" "}
                  <Link href="/privacy" className="text-primary underline">
                    {t("acceptTermsPrivacy")}
                  </Link>
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />

        {serverError && (
          <p className="text-sm text-destructive">{serverError}</p>
        )}

        <Button type="submit" className="w-full" isLoading={isPending}>
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

- [ ] **Step 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak błędów

- [ ] **Step 3: Commit**

```bash
git add src/domains/auth/components/register-form.tsx
git commit -m "feat(auth): add terms acceptance checkbox to registration form"
```

---

## Task 6: Stwórz Server Action `deleteAccount` + testy

**Files:**
- Create: `src/domains/auth/actions/delete-account.ts`
- Create: `tests/domains/auth/actions/delete-account.test.ts`
- Modify: `src/domains/auth/index.ts`

- [ ] **Step 1: Napisz failing test**

Utwórz `tests/domains/auth/actions/delete-account.test.ts`:

```typescript
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteAccount } from "@/domains/auth/actions/delete-account";

vi.mock("@/domains/auth/lib/auth", () => ({
  auth: vi.fn(),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/shared/db", () => {
  const mockTx = {
    delete: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
  mockTx.delete.mockReturnValue({ where: mockTx.where });
  mockTx.update.mockReturnValue({ set: vi.fn().mockReturnValue({ where: mockTx.where }) });

  const mockDb = {
    transaction: vi.fn(async (fn: (tx: typeof mockTx) => Promise<void>) => {
      await fn(mockTx);
    }),
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
  };
  return { db: mockDb };
});

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not authenticated", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const result = await deleteAccount("jan@example.com");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("returns error when confirmed email does not match", async () => {
    const { auth } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      email: "jan@example.com",
    } as any);

    const result = await deleteAccount("wrong@example.com");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBeDefined();
  });

  it("anonymizes user data when email matches", async () => {
    const { auth, signOut } = await import("@/domains/auth/lib/auth");
    const { db } = await import("@/shared/db");

    vi.mocked(auth).mockResolvedValueOnce({
      user: { id: "user-1" },
    } as any);
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: "user-1",
      email: "jan@example.com",
    } as any);

    const result = await deleteAccount("jan@example.com");

    expect(db.transaction).toHaveBeenCalled();
    expect(signOut).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Uruchom test — sprawdź że failuje**

```bash
npx vitest run tests/domains/auth/actions/delete-account.test.ts
```

Expected: FAIL — plik `delete-account.ts` nie istnieje

- [ ] **Step 3: Zaimplementuj `deleteAccount`**

Utwórz `src/domains/auth/actions/delete-account.ts`:

```typescript
"use server";

import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { auth, signOut } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import { users, authAccounts, sessions } from "@/shared/db/schema";

type DeleteAccountResult =
  | { success: true }
  | { success: false; error: string };

export async function deleteAccount(
  confirmedEmail: string
): Promise<DeleteAccountResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Nie jestes zalogowany" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) {
    return { success: false, error: "Uzytkownik nie istnieje" };
  }

  if (user.email !== confirmedEmail) {
    return {
      success: false,
      error: "Podany email nie zgadza sie z Twoim kontem",
    };
  }

  const anonymizedEmail =
    createHash("sha256").update(user.email).digest("hex") +
    "@deleted.plonbli.pl";

  await db.transaction(async (tx) => {
    await tx.delete(sessions).where(eq(sessions.userId, user.id));
    await tx.delete(authAccounts).where(eq(authAccounts.userId, user.id));
    await tx
      .update(users)
      .set({
        name: "Uzytkownik usuniety",
        email: anonymizedEmail,
        passwordHash: null,
        avatar: null,
        bio: null,
      })
      .where(eq(users.id, user.id));
  });

  await signOut({ redirectTo: "/login" });

  return { success: true };
}
```

- [ ] **Step 4: Uruchom testy — sprawdź że przechodzą**

```bash
npx vitest run tests/domains/auth/actions/delete-account.test.ts
```

Expected: wszystkie PASS

- [ ] **Step 5: Wyeksportuj z `src/domains/auth/index.ts`**

Otwórz `src/domains/auth/index.ts` i dodaj:

```typescript
export { deleteAccount } from "./actions/delete-account";
```

- [ ] **Step 6: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak błędów

- [ ] **Step 7: Commit**

```bash
git add src/domains/auth/actions/delete-account.ts tests/domains/auth/actions/delete-account.test.ts src/domains/auth/index.ts
git commit -m "feat(auth): add deleteAccount server action with user anonymization"
```

---

## Task 7: Stwórz API route eksportu danych

**Files:**
- Create: `src/app/api/user/export/route.ts`

- [ ] **Step 1: Utwórz API route**

Utwórz katalog i plik `src/app/api/user/export/route.ts`:

```typescript
import { eq, or } from "drizzle-orm";
import { auth } from "@/domains/auth/lib/auth";
import { db } from "@/shared/db";
import {
  users,
  orders,
  posts,
  reviews,
  listings,
  products,
} from "@/shared/db/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const [user, userOrders, userPosts, reviewsGiven, reviewsReceived, userListings] =
    await Promise.all([
      db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          bio: true,
          role: true,
          voivodeship: true,
          county: true,
          commune: true,
          postalCode: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.query.orders.findMany({
        where: or(
          eq(orders.customerId, userId),
          eq(orders.farmerId, userId)
        ),
      }),
      db.query.posts.findMany({
        where: eq(posts.authorId, userId),
      }),
      db.query.reviews.findMany({
        where: eq(reviews.reviewerId, userId),
      }),
      db.query.reviews.findMany({
        where: eq(reviews.targetId, userId),
      }),
      db
        .select({ listing: listings })
        .from(listings)
        .innerJoin(products, eq(listings.productId, products.id))
        .where(eq(products.farmerId, userId)),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user,
    orders: userOrders,
    posts: userPosts,
    reviewsGiven,
    reviewsReceived,
    listings: userListings.map((row) => row.listing),
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="plonbli-dane.json"',
    },
  });
}
```

- [ ] **Step 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak błędów

- [ ] **Step 3: Przetestuj ręcznie**

Uruchom dev server (`npm run dev`), zaloguj się, otwórz w przeglądarce:
`http://localhost:3000/api/user/export`

Expected: przeglądarka pobiera plik `plonbli-dane.json` z danymi zalogowanego użytkownika

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/export/route.ts
git commit -m "feat(api): add user data export endpoint returning JSON file"
```

---

## Task 8: Stwórz `DeleteAccountDialog` client component

**Files:**
- Create: `src/app/[locale]/(main)/profile/delete-account-dialog.tsx`

- [ ] **Step 1: Utwórz komponent dialogu**

Utwórz `src/app/[locale]/(main)/profile/delete-account-dialog.tsx`:

```typescript
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/domains/auth";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";

export function DeleteAccountDialog({ userEmail }: { userEmail: string }) {
  const t = useTranslations("profile");
  const [confirmedEmail, setConfirmedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConfirmed = confirmedEmail === userEmail;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount(confirmedEmail);
      if (!result.success) {
        setError(result.error);
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex items-center justify-between w-full px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-sm text-destructive">
          <span className="flex items-center gap-3">
            <Trash2 className="h-4 w-4" />
            {t("deleteAccount")}
          </span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteAccountDialogTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteAccountDialogDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <p className="text-sm text-muted-foreground">
            {t("deleteAccountConfirmLabel")}
          </p>
          <Input
            type="email"
            value={confirmedEmail}
            onChange={(e) => setConfirmedEmail(e.target.value)}
            placeholder={userEmail}
            autoComplete="off"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setConfirmedEmail(""); setError(null); }}>
            {t("deleteAccountCancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={!isConfirmed || isPending}
            onClick={handleDelete}
            isLoading={isPending}
          >
            {t("deleteAccountConfirmButton")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak błędów

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(main)/profile/delete-account-dialog.tsx"
git commit -m "feat(profile): add DeleteAccountDialog client component"
```

---

## Task 9: Dodaj kartę "Prawa i dokumenty" do strony profilu

**Files:**
- Modify: `src/app/[locale]/(main)/profile/page.tsx`

- [ ] **Step 1: Dodaj importy do `profile/page.tsx`**

Na początku pliku `src/app/[locale]/(main)/profile/page.tsx` dodaj import komponentu dialogu:

```typescript
import { DeleteAccountDialog } from "./delete-account-dialog";
```

Zaktualizuj istniejący import z lucide-react — dodaj `Shield` i `Download`:

```typescript
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
  Shield,
  Download,
} from "lucide-react";
```

- [ ] **Step 2: Dodaj `tLegal` do funkcji `ProfilePage`**

W ciele funkcji `ProfilePage`, zaraz po istniejących wywołaniach `getTranslations`, dodaj:

```typescript
const tLegal = await getTranslations("legal");
```

- [ ] **Step 3: Dodaj kartę "Prawa i dokumenty" do JSX**

W JSX, tuż przed zamykającym `</div>` (po ostatniej istniejącej `</Card>`), dodaj:

```tsx
{/* Prawa i dokumenty */}
<Card>
  <CardContent className="pt-4 pb-2">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 pb-2">
      {t("legalSection")}
    </p>
    <nav className="space-y-1">
      <Link
        href="/terms"
        className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
      >
        <span className="flex items-center gap-3 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          {tLegal("termsOfService")}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
      <Link
        href="/privacy"
        className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
      >
        <span className="flex items-center gap-3 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground" />
          {tLegal("privacyPolicy")}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </Link>
      <Separator className="my-1" />
      <a
        href="/api/user/export"
        download="plonbli-dane.json"
        className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-accent transition-colors"
      >
        <span className="flex items-center gap-3 text-sm">
          <Download className="h-4 w-4 text-muted-foreground" />
          {t("downloadData")}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </a>
      <Separator className="my-1" />
      <DeleteAccountDialog userEmail={user.email} />
    </nav>
  </CardContent>
</Card>
```

- [ ] **Step 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: brak błędów

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(main)/profile/page.tsx"
git commit -m "feat(profile): add legal documents and GDPR rights section"
```

---

## Task 10: Uruchom wszystkie testy i finalne sprawdzenie

**Files:** brak zmian

- [ ] **Step 1: Uruchom pełen test suite**

```bash
npx vitest run
```

Expected:
```
Test Files  52 passed (52)
Tests  280+ passed
```

- [ ] **Step 2: Sprawdź TypeScript kompilację**

```bash
npx tsc --noEmit
```

Expected: brak błędów

- [ ] **Step 3: Sprawdź ręcznie w przeglądarce**

1. Otwórz `/login` — sprawdź stopkę z "Regulamin · Polityka prywatności"
2. Otwórz `/register` — sprawdź checkbox akceptacji, spróbuj wysłać bez zaznaczenia (powinien być błąd)
3. Otwórz `/profile` — sprawdź kartę "Prawa i dokumenty" z linkami, przyciskiem pobierania i usunięcia konta
4. Kliknij "Pobierz swoje dane" — przeglądarka powinna pobrać plik JSON
5. Kliknij "Usuń konto" — sprawdź dialog, wpisz niepoprawny email (przycisk nieaktywny), wpisz poprawny (przycisk aktywny)
