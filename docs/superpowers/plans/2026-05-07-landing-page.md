# Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public landing page at `/` that explains Plonbli to new visitors and guides them to register, while showing authenticated users a "Go to app" CTA.

**Architecture:** New `(public)` route group with minimal header+footer layout (no NavBar, no auth redirect). Landing sections live in `src/domains/marketing/`. The page checks `auth()` server-side and passes `isLoggedIn: boolean` to auth-aware sections. All strings in new `landing` namespace in `messages/pl.json`.

**Tech Stack:** Next.js 15 App Router, Server Components, next-intl (`getTranslations` / `useTranslations`), shadcn/ui (Button, Card, Tabs), Tailwind CSS, Lucide icons.

---

## File Map

**Create:**
- `src/app/[locale]/(public)/layout.tsx` — sticky header (logo + auth CTA) + footer, no NavBar
- `src/app/[locale]/(public)/page.tsx` — assembles all sections, checks auth
- `src/domains/marketing/components/hero-section.tsx` — tagline + CTA buttons (Server Component)
- `src/domains/marketing/components/how-it-works-section.tsx` — tabbed steps (Client Component, receives translated strings as props)
- `src/domains/marketing/components/for-consumer-section.tsx` — consumer benefits (Server Component)
- `src/domains/marketing/components/for-farmer-section.tsx` — farmer benefits (Server Component)
- `src/domains/marketing/components/proxy-farmer-section.tsx` — ProxyFarmer explanation (Server Component)
- `src/domains/marketing/components/features-section.tsx` — feature cards grid (Server Component)
- `src/domains/marketing/components/app-preview-section.tsx` — app mockup placeholder (Server Component)
- `src/domains/marketing/components/faq-section.tsx` — FAQ with native `<details>` (Server Component)
- `src/domains/marketing/index.ts` — barrel export

**Modify:**
- `messages/pl.json` — add `landing` namespace
- `src/app/[locale]/(main)/page.tsx` — remove dead `GuestHome` component + its imports

---

### Task 1: Add landing translations to messages/pl.json

**Files:**
- Modify: `messages/pl.json`

- [ ] **Step 1.1: Add `landing` namespace**

Open `messages/pl.json`. Before the final closing `}`, add a comma after the last existing key and insert:

```json
"landing": {
  "nav": {
    "login": "Zaloguj się",
    "goToApp": "Przejdź do aplikacji"
  },
  "hero": {
    "tagline": "Świeże produkty prosto od rolnika",
    "subtitle": "Połącz się z lokalnymi rolnikami, kupuj bez pośredników i wspieraj lokalną społeczność.",
    "ctaRegister": "Dołącz do plonbli",
    "ctaLogin": "Zaloguj się",
    "ctaApp": "Przejdź do aplikacji"
  },
  "howItWorks": {
    "title": "Jak to działa",
    "tabConsumer": "Jestem konsumentem",
    "tabFarmer": "Jestem rolnikiem",
    "consumerStep1Title": "Zarejestruj się",
    "consumerStep1Desc": "Utwórz bezpłatne konto w kilka sekund.",
    "consumerStep2Title": "Znajdź produkty",
    "consumerStep2Desc": "Przeglądaj oferty lokalnych rolników w twojej okolicy.",
    "consumerStep3Title": "Umów odbiór",
    "consumerStep3Desc": "Skontaktuj się bezpośrednio z rolnikiem i zamów produkty.",
    "farmerStep1Title": "Zarejestruj się",
    "farmerStep1Desc": "Utwórz bezpłatne konto i uzupełnij profil.",
    "farmerStep2Title": "Dodaj oferty",
    "farmerStep2Desc": "Opublikuj swoje produkty z opisami i cenami.",
    "farmerStep3Title": "Przyjmuj zamówienia",
    "farmerStep3Desc": "Kontaktuj się z klientami i realizuj zamówienia bezpośrednio."
  },
  "forConsumer": {
    "title": "Dla konsumenta",
    "subtitle": "Odkryj smak prawdziwej lokalnej żywności",
    "benefit1Title": "Świeże produkty bez pośredników",
    "benefit1Desc": "Kupujesz bezpośrednio od rolnika — świeższe i tańsze.",
    "benefit2Title": "Wiesz skąd pochodzi żywność",
    "benefit2Desc": "Pełna transparentność — historia upraw i metody produkcji.",
    "benefit3Title": "Bezpośredni kontakt z rolnikiem",
    "benefit3Desc": "Czat, pytania, umówienie odbioru — wszystko w jednym miejscu.",
    "benefit4Title": "Lokalna społeczność",
    "benefit4Desc": "Dołącz do grup, wydarzeń i bądź na bieżąco z lokalnymi rolnikami."
  },
  "forFarmer": {
    "title": "Dla rolnika",
    "subtitle": "Sprzedawaj bezpośrednio, zarabiaj więcej",
    "benefit1Title": "Sprzedaż bez pośredników",
    "benefit1Desc": "Cały zysk trafia do ciebie — zero prowizji, zero pośredników.",
    "benefit2Title": "Dokumentacja upraw",
    "benefit2Desc": "Prowadź dziennik upraw z historią zmian gotową na wymogi przyszłości.",
    "benefit3Title": "System opinii i reputacji",
    "benefit3Desc": "Buduj zaufanie klientów przez transparentny system ocen.",
    "benefit4Title": "Bezpłatna platforma",
    "benefit4Desc": "Wszystkie funkcje dostępne za darmo — bez ukrytych opłat."
  },
  "proxyFarmer": {
    "title": "Profil-ambasador",
    "subtitle": "Pomóż lokalnemu rolnikowi zaistnieć w sieci",
    "description": "Znasz rolnika który nie korzysta z internetu? Utwórz mu profil-ambasador — wizytówkę z produktami i danymi kontaktowymi. Inni użytkownicy znajdą go na platformie i skontaktują się bezpośrednio.",
    "feature1": "Każdy użytkownik może stworzyć do 3 profili dla lokalnych rolników",
    "feature2": "Profil zawiera produkty, metody kontaktu i lokalizację",
    "feature3": "Użytkownicy mogą obserwować profil i być na bieżąco z ofertą",
    "ctaLoggedIn": "Dodaj rolnika",
    "ctaGuest": "Zarejestruj się i dodaj rolnika"
  },
  "features": {
    "title": "Co oferuje plonbli",
    "marketplaceTitle": "Marketplace",
    "marketplaceDesc": "Przeglądaj i zamawiaj lokalne produkty.",
    "socialTitle": "Social feed",
    "socialDesc": "Aktualności od rolników których obserwujesz.",
    "groupsTitle": "Grupy i wydarzenia",
    "groupsDesc": "Lokalne społeczności i targi.",
    "chatTitle": "Czat",
    "chatDesc": "Bezpośrednia komunikacja z rolnikiem.",
    "cropLogTitle": "Dokumentacja upraw",
    "cropLogDesc": "Przejrzysta historia produkcji.",
    "reputationTitle": "Opinie i reputacja",
    "reputationDesc": "Zaufany system ocen."
  },
  "appPreview": {
    "title": "Wszystko w jednej aplikacji",
    "subtitle": "Dostępna jako PWA — działa jak natywna aplikacja na telefonie."
  },
  "faq": {
    "title": "Najczęstsze pytania",
    "q1": "Czy platforma jest bezpłatna?",
    "a1": "Tak, plonbli jest w pełni bezpłatne dla wszystkich użytkowników — zarówno rolników, jak i konsumentów. Nie pobieramy żadnych prowizji ani opłat.",
    "q2": "Jak złożyć zamówienie?",
    "a2": "Znajdź interesującą ofertę w Marketplace, kliknij \"Dodaj do koszyka\" i przejdź do realizacji zamówienia. Rolnik otrzyma powiadomienie i skontaktuje się z tobą.",
    "q3": "Jak dodać ofertę jako rolnik?",
    "a3": "Po zalogowaniu przejdź do Marketplace i kliknij \"Dodaj ofertę\". Wypełnij formularz z opisem, ceną i metodą dostawy.",
    "q4": "Co to jest profil-ambasador?",
    "a4": "Profil-ambasador (ProxyFarmer) to wizytówka stworzona przez użytkownika dla rolnika który nie jest na platformie. Każdy może dodać do 3 takich profili.",
    "q5": "Jak działają opinie i reputacja?",
    "a5": "Po każdej transakcji możesz wystawić opinię rolnikowi. Opinie są publiczne i pomagają innym użytkownikom w wyborze sprawdzonych sprzedawców.",
    "q6": "Czy moje dane są bezpieczne?",
    "a6": "Tak. Stosujemy standardowe zabezpieczenia, a Twoje dane osobowe przetwarzamy zgodnie z RODO. Szczegóły w Polityce Prywatności."
  }
}
```

- [ ] **Step 1.2: Verify JSON is valid**

```bash
python -c "import json; json.load(open('messages/pl.json'))" && echo "OK"
```

Expected: `OK`

- [ ] **Step 1.3: Commit translations**

```bash
git add messages/pl.json
git commit -m "feat(landing): add landing page translation strings"
```

---

### Task 2: Create (public) layout

**Files:**
- Create: `src/app/[locale]/(public)/layout.tsx`

- [ ] **Step 2.1: Create layout file**

Create `src/app/[locale]/(public)/layout.tsx`:

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sprout } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ThemeToggle } from "@/shared/ui/theme-toggle";
import { auth } from "@/domains/auth/lib/auth";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const t = await getTranslations("landing.nav");
  const tLegal = await getTranslations("legal");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Sprout className="h-5 w-5 text-primary" />
            plonbli
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isLoggedIn ? (
              <Button asChild size="sm">
                <Link href="/social">{t("goToApp")}</Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/login">{t("login")}</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sprout className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">plonbli</span>
          </div>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">
              {tLegal("termsOfService")}
            </Link>
            <Link href="/privacy" className="hover:underline">
              {tLegal("privacyPolicy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2.2: Commit layout**

```bash
git add "src/app/[locale]/(public)/layout.tsx"
git commit -m "feat(landing): add (public) route group layout"
```

---

### Task 3: HeroSection

**Files:**
- Create: `src/domains/marketing/components/hero-section.tsx`

- [ ] **Step 3.1: Create HeroSection**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Sprout } from "lucide-react";
import { Button } from "@/shared/ui/button";

export async function HeroSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = await getTranslations("landing.hero");

  return (
    <section className="max-w-3xl mx-auto text-center px-4 py-20 space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Sprout className="h-12 w-12 text-primary" />
        </div>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
        {t("tagline")}
      </h1>
      <p className="text-xl text-muted-foreground max-w-xl mx-auto">
        {t("subtitle")}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        {isLoggedIn ? (
          <Button asChild size="lg">
            <Link href="/social">{t("ctaApp")}</Link>
          </Button>
        ) : (
          <>
            <Button asChild size="lg">
              <Link href="/register">{t("ctaRegister")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">{t("ctaLogin")}</Link>
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/domains/marketing/components/hero-section.tsx
git commit -m "feat(landing): add HeroSection"
```

---

### Task 4: HowItWorksSection (Client Component)

**Files:**
- Create: `src/domains/marketing/components/how-it-works-section.tsx`

HowItWorks uses Tabs which requires client-side JS. The component receives all translated strings as props — the parent `page.tsx` fetches them server-side.

- [ ] **Step 4.1: Create HowItWorksSection**

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { UserRound, Tractor } from "lucide-react";

interface Step {
  title: string;
  desc: string;
}

interface HowItWorksSectionProps {
  title: string;
  tabConsumer: string;
  tabFarmer: string;
  consumerSteps: Step[];
  farmerSteps: Step[];
}

export function HowItWorksSection({
  title,
  tabConsumer,
  tabFarmer,
  consumerSteps,
  farmerSteps,
}: HowItWorksSectionProps) {
  return (
    <section className="py-16 bg-muted/50">
      <div className="max-w-3xl mx-auto px-4 space-y-8">
        <h2 className="text-3xl font-bold text-center">{title}</h2>
        <Tabs defaultValue="consumer" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="consumer" className="gap-2">
              <UserRound className="h-4 w-4" />
              {tabConsumer}
            </TabsTrigger>
            <TabsTrigger value="farmer" className="gap-2">
              <Tractor className="h-4 w-4" />
              {tabFarmer}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="consumer" className="mt-6">
            <StepList steps={consumerSteps} />
          </TabsContent>
          <TabsContent value="farmer" className="mt-6">
            <StepList steps={farmerSteps} />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-6">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-4 items-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
            {i + 1}
          </div>
          <div>
            <p className="font-semibold">{step.title}</p>
            <p className="text-muted-foreground text-sm mt-1">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4.2: Commit**

```bash
git add src/domains/marketing/components/how-it-works-section.tsx
git commit -m "feat(landing): add HowItWorksSection"
```

---

### Task 5: ForConsumerSection and ForFarmerSection

**Files:**
- Create: `src/domains/marketing/components/for-consumer-section.tsx`
- Create: `src/domains/marketing/components/for-farmer-section.tsx`

- [ ] **Step 5.1: Create ForConsumerSection**

```tsx
import { getTranslations } from "next-intl/server";
import { ShoppingBasket, Leaf, MessageCircle, Users } from "lucide-react";

export async function ForConsumerSection() {
  const t = await getTranslations("landing.forConsumer");

  const benefits = [
    { Icon: ShoppingBasket, title: t("benefit1Title"), desc: t("benefit1Desc") },
    { Icon: Leaf, title: t("benefit2Title"), desc: t("benefit2Desc") },
    { Icon: MessageCircle, title: t("benefit3Title"), desc: t("benefit3Desc") },
    { Icon: Users, title: t("benefit4Title"), desc: t("benefit4Desc") },
  ];

  return (
    <section className="py-16">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {benefits.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex gap-4 items-start p-4 rounded-lg border bg-card"
            >
              <div className="flex-shrink-0 rounded-md bg-primary/10 p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5.2: Create ForFarmerSection**

```tsx
import { getTranslations } from "next-intl/server";
import { Banknote, BookOpen, Star, Gift } from "lucide-react";

export async function ForFarmerSection() {
  const t = await getTranslations("landing.forFarmer");

  const benefits = [
    { Icon: Banknote, title: t("benefit1Title"), desc: t("benefit1Desc") },
    { Icon: BookOpen, title: t("benefit2Title"), desc: t("benefit2Desc") },
    { Icon: Star, title: t("benefit3Title"), desc: t("benefit3Desc") },
    { Icon: Gift, title: t("benefit4Title"), desc: t("benefit4Desc") },
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {benefits.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="flex gap-4 items-start p-4 rounded-lg border bg-card"
            >
              <div className="flex-shrink-0 rounded-md bg-primary/10 p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5.3: Commit**

```bash
git add src/domains/marketing/components/for-consumer-section.tsx src/domains/marketing/components/for-farmer-section.tsx
git commit -m "feat(landing): add ForConsumerSection and ForFarmerSection"
```

---

### Task 6: ProxyFarmerSection

**Files:**
- Create: `src/domains/marketing/components/proxy-farmer-section.tsx`

- [ ] **Step 6.1: Create ProxyFarmerSection**

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { UserRoundPlus, Check } from "lucide-react";
import { Button } from "@/shared/ui/button";

export async function ProxyFarmerSection({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = await getTranslations("landing.proxyFarmer");

  const features = [t("feature1"), t("feature2"), t("feature3")];

  return (
    <section className="py-16">
      <div className="max-w-3xl mx-auto px-4">
        <div className="rounded-2xl border bg-card p-8 md:p-12 space-y-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <UserRoundPlus className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">{t("title")}</h2>
            <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
          <p className="text-muted-foreground text-center">{t("description")}</p>
          <ul className="space-y-3 max-w-md mx-auto">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-center pt-2">
            {isLoggedIn ? (
              <Button asChild>
                <Link href="/farmers/proxy/create">{t("ctaLoggedIn")}</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/register">{t("ctaGuest")}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6.2: Commit**

```bash
git add src/domains/marketing/components/proxy-farmer-section.tsx
git commit -m "feat(landing): add ProxyFarmerSection"
```

---

### Task 7: FeaturesSection

**Files:**
- Create: `src/domains/marketing/components/features-section.tsx`

- [ ] **Step 7.1: Create FeaturesSection**

```tsx
import { getTranslations } from "next-intl/server";
import { ShoppingBasket, Rss, Users, MessageCircle, BookOpen, Star } from "lucide-react";

export async function FeaturesSection() {
  const t = await getTranslations("landing.features");

  const features = [
    { Icon: ShoppingBasket, title: t("marketplaceTitle"), desc: t("marketplaceDesc") },
    { Icon: Rss, title: t("socialTitle"), desc: t("socialDesc") },
    { Icon: Users, title: t("groupsTitle"), desc: t("groupsDesc") },
    { Icon: MessageCircle, title: t("chatTitle"), desc: t("chatDesc") },
    { Icon: BookOpen, title: t("cropLogTitle"), desc: t("cropLogDesc") },
    { Icon: Star, title: t("reputationTitle"), desc: t("reputationDesc") },
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="max-w-5xl mx-auto px-4 space-y-10">
        <h2 className="text-3xl font-bold text-center">{t("title")}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ Icon, title, desc }) => (
            <div key={title} className="rounded-lg border bg-card p-5 space-y-2">
              <div className="rounded-md bg-primary/10 w-fit p-2">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7.2: Commit**

```bash
git add src/domains/marketing/components/features-section.tsx
git commit -m "feat(landing): add FeaturesSection"
```

---

### Task 8: AppPreviewSection

**Files:**
- Create: `src/domains/marketing/components/app-preview-section.tsx`

- [ ] **Step 8.1: Create AppPreviewSection**

Uses a styled CSS phone-frame placeholder. Replace with a real screenshot later by adding `public/images/app-preview.png` and swapping the placeholder div for `<Image>`.

```tsx
import { getTranslations } from "next-intl/server";
import { Smartphone } from "lucide-react";

export async function AppPreviewSection() {
  const t = await getTranslations("landing.appPreview");

  return (
    <section className="py-16">
      <div className="max-w-3xl mx-auto px-4 text-center space-y-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">{t("title")}</h2>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </div>
        <div className="flex justify-center">
          <div className="relative w-56 h-96 rounded-[2.5rem] border-4 border-foreground/20 bg-muted shadow-xl flex items-center justify-center">
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full bg-foreground/20" />
            <Smartphone className="h-16 w-16 text-muted-foreground/30" />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8.2: Commit**

```bash
git add src/domains/marketing/components/app-preview-section.tsx
git commit -m "feat(landing): add AppPreviewSection"
```

---

### Task 9: FaqSection

**Files:**
- Create: `src/domains/marketing/components/faq-section.tsx`

- [ ] **Step 9.1: Create FaqSection**

Uses native `<details>`/`<summary>` for zero-JS accordion — no extra shadcn component needed.

```tsx
import { getTranslations } from "next-intl/server";

export async function FaqSection() {
  const t = await getTranslations("landing.faq");

  const items = [
    { q: t("q1"), a: t("a1") },
    { q: t("q2"), a: t("a2") },
    { q: t("q3"), a: t("a3") },
    { q: t("q4"), a: t("a4") },
    { q: t("q5"), a: t("a5") },
    { q: t("q6"), a: t("a6") },
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl font-bold text-center">{t("title")}</h2>
        <div className="space-y-2">
          {items.map(({ q, a }, i) => (
            <details
              key={i}
              className="group rounded-lg border bg-card px-4 py-3 cursor-pointer"
            >
              <summary className="font-medium list-none flex items-center justify-between select-none">
                {q}
                <span className="ml-4 text-muted-foreground transition-transform group-open:rotate-45 flex-shrink-0 text-lg leading-none">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 9.2: Commit**

```bash
git add src/domains/marketing/components/faq-section.tsx
git commit -m "feat(landing): add FaqSection"
```

---

### Task 10: Barrel export

**Files:**
- Create: `src/domains/marketing/index.ts`

- [ ] **Step 10.1: Create index.ts**

```ts
export { HeroSection } from "./components/hero-section";
export { HowItWorksSection } from "./components/how-it-works-section";
export { ForConsumerSection } from "./components/for-consumer-section";
export { ForFarmerSection } from "./components/for-farmer-section";
export { ProxyFarmerSection } from "./components/proxy-farmer-section";
export { FeaturesSection } from "./components/features-section";
export { AppPreviewSection } from "./components/app-preview-section";
export { FaqSection } from "./components/faq-section";
```

- [ ] **Step 10.2: Commit**

```bash
git add src/domains/marketing/index.ts
git commit -m "feat(landing): add marketing domain barrel export"
```

---

### Task 11: Create landing page (public)/page.tsx

**Files:**
- Create: `src/app/[locale]/(public)/page.tsx`

The page is a Server Component. It fetches translations for `HowItWorksSection` (which is a Client Component and cannot call `getTranslations` itself) and passes them as props.

- [ ] **Step 11.1: Create page.tsx**

```tsx
import { getTranslations } from "next-intl/server";
import { auth } from "@/domains/auth/lib/auth";
import {
  HeroSection,
  HowItWorksSection,
  ForConsumerSection,
  ForFarmerSection,
  ProxyFarmerSection,
  FeaturesSection,
  AppPreviewSection,
  FaqSection,
} from "@/domains/marketing";

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user?.id;
  const t = await getTranslations("landing.howItWorks");

  const consumerSteps = [
    { title: t("consumerStep1Title"), desc: t("consumerStep1Desc") },
    { title: t("consumerStep2Title"), desc: t("consumerStep2Desc") },
    { title: t("consumerStep3Title"), desc: t("consumerStep3Desc") },
  ];

  const farmerSteps = [
    { title: t("farmerStep1Title"), desc: t("farmerStep1Desc") },
    { title: t("farmerStep2Title"), desc: t("farmerStep2Desc") },
    { title: t("farmerStep3Title"), desc: t("farmerStep3Desc") },
  ];

  return (
    <>
      <HeroSection isLoggedIn={isLoggedIn} />
      <HowItWorksSection
        title={t("title")}
        tabConsumer={t("tabConsumer")}
        tabFarmer={t("tabFarmer")}
        consumerSteps={consumerSteps}
        farmerSteps={farmerSteps}
      />
      <ForConsumerSection />
      <ForFarmerSection />
      <ProxyFarmerSection isLoggedIn={isLoggedIn} />
      <FeaturesSection />
      <AppPreviewSection />
      <FaqSection />
    </>
  );
}
```

- [ ] **Step 11.2: Commit**

```bash
git add "src/app/[locale]/(public)/page.tsx"
git commit -m "feat(landing): add landing page route"
```

---

### Task 12: Remove dead GuestHome from (main)/page.tsx

**Files:**
- Modify: `src/app/[locale]/(main)/page.tsx`

`GuestHome` is never reached — the `(main)` layout redirects unauthenticated users to `/login` before the page renders. Remove it.

- [ ] **Step 12.1: Replace the file content**

Replace `src/app/[locale]/(main)/page.tsx` with the cleaned-up version (remove `GuestHome` function and the dead `if (!session?.user?.id)` branch, remove unused imports `Sprout` and `Button` from the top-level `HomePage` — note `Button` is still used by `SectionHeader` so keep it):

```tsx
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { auth } from "@/domains/auth/lib/auth";
import { getListings } from "@/domains/marketplace/queries/get-listings";
import { getEvents } from "@/domains/social/queries/get-events";
import { getGroups } from "@/domains/social/queries/get-groups";
import { getFeed } from "@/domains/social/queries/get-feed";
import { ListingCard } from "@/domains/marketplace/components/listing-card";
import { EventCard } from "@/domains/social/components/event-card";
import { GroupCard } from "@/domains/social/components/group-card";
import { PostCard } from "@/domains/social/components/post-card";
import { Button } from "@/shared/ui/button";

export default async function HomePage() {
  const session = await auth();
  return <AuthenticatedHome userId={session!.user!.id!} />;
}

async function AuthenticatedHome({ userId }: { userId: string }) {
  const t = await getTranslations("home");
  const tc = await getTranslations("common");

  const [{ results: listings }, events, groups, feed] = await Promise.all([
    getListings({ sort: "newest", page: 1 }),
    getEvents({ upcoming: true }),
    getGroups(userId),
    getFeed(userId, 1),
  ]);

  const myGroups = groups.filter((g) => g.isMember);

  return (
    <div className="space-y-10 py-6">
      {feed.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 space-y-4">
          <SectionHeader
            title={t("yourFeed")}
            href="/social"
            more={tc("showMore")}
          />
          <div className="space-y-4">
            {feed.slice(0, 3).map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={userId}
              />
            ))}
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 space-y-4">
        <SectionHeader
          title={t("latestListings")}
          href="/marketplace"
          more={tc("showMore")}
        />
        {listings.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noListings")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listings.slice(0, 3).map((item) => (
              <ListingCard key={item.listing.id} item={item} hideImage />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 space-y-4">
        <SectionHeader
          title={t("upcomingEvents")}
          href="/social/events"
          more={tc("showMore")}
        />
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noEvents")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {events.slice(0, 3).map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {myGroups.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 space-y-4">
          <SectionHeader
            title={t("yourGroups")}
            href="/social/groups"
            more={tc("showMore")}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.slice(0, 3).map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  title,
  href,
  more,
}: {
  title: string;
  href: string;
  more: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold">{title}</h2>
      <Button asChild variant="ghost" size="sm">
        <Link href={href}>
          {more}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Link>
      </Button>
    </div>
  );
}
```

- [ ] **Step 12.2: Commit**

```bash
git add "src/app/[locale]/(main)/page.tsx"
git commit -m "refactor(home): remove dead GuestHome component"
```

---

### Task 13: TypeScript check + verify

- [ ] **Step 13.1: Run TypeScript check**

```bash
cd D:/plonbli && npx tsc --noEmit 2>&1 | head -50
```

Expected: no errors in landing page or marketing domain files. Fix any type errors before moving on.

- [ ] **Step 13.2: Check next-intl nested key access works**

Verify `getTranslations("landing.hero")` pattern works by checking the next-intl version:

```bash
cat package.json | python -c "import sys,json; d=json.load(sys.stdin); print(d['dependencies'].get('next-intl','not found'))"
```

If version is `^3.x` or higher — nested namespace access (`"landing.hero"`) is supported. No action needed.

- [ ] **Step 13.3: Final commit if anything remained unstaged**

```bash
git status
```

If all tasks were committed incrementally, this should show a clean working tree.
