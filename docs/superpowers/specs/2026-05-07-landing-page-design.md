# Landing Page Design

**Date:** 2026-05-07
**Status:** Approved
**Scope:** Public landing page at `/` for the Plonbli platform

---

## 1. Goal

Create a public landing page that explains the Plonbli platform to new visitors (both potential consumers and farmers) and guides them toward registration. Authenticated users see the same page with adjusted CTAs pointing to the main app.

---

## 2. Architecture

### Route group

New route group `(public)` alongside existing `(auth)`, `(main)`, and `(legal)`:

```
src/app/[locale]/(public)/
  layout.tsx        ← minimal public layout: top header (logo + login link) + footer
  page.tsx          ← landing page root, checks auth(), passes isLoggedIn to sections
```

### Domain

New domain `src/domains/marketing/` to keep all landing-specific components isolated:

```
src/domains/marketing/
  components/
    hero-section.tsx
    how-it-works-section.tsx
    for-consumer-section.tsx
    for-farmer-section.tsx
    proxy-farmer-section.tsx
    features-section.tsx
    app-preview-section.tsx
    faq-section.tsx
  index.ts           ← barrel export
```

### Auth-awareness

`page.tsx` is a Server Component that calls `auth()` and passes `isLoggedIn: boolean` as a prop to the `HeroSection` and `(public)` layout. No redirect — both logged-in and logged-out users see the full landing page.

### i18n

New namespace `landing` added to `messages/pl.json`. All user-facing strings go through `next-intl` — no hardcoded Polish text in components.

### Existing code cleanup

`GuestHome` component in `src/app/[locale]/(main)/page.tsx` is dead code (the `(main)` layout redirects unauthenticated users before it is reached). Remove it as part of this work.

---

## 3. Layout (`(public)/layout.tsx`)

Minimal, full-width layout:

- **Header:** logo (bee+leaf icon + "Plonbli" wordmark), right side: "Zaloguj się" link (or "Przejdź do aplikacji" if `isLoggedIn`)
- **Footer:** logo, links to Regulamin and Polityka prywatności
- No NavBar (that belongs to `(main)`)
- No auth redirect

---

## 4. Page sections (in order)

### 4.1 Hero
- Large tagline (1 short sentence)
- Subtitle (1–2 sentences describing the platform)
- Two CTAs:
  - Unauthenticated: primary "Zarejestruj się" (`/register`) + secondary "Zaloguj się" (`/login`)
  - Authenticated: primary "Przejdź do aplikacji" (`/social`)
- Bee+leaf icon or logo above tagline

### 4.2 Jak to działa
- Two tabs (or toggle): "Jestem konsumentem" / "Jestem rolnikiem"
- Each tab shows 3 numbered steps with icon + title + short description:
  - **Konsument:** Zarejestruj się → Znajdź rolnika lub produkt → Umów odbiór lub dostawę
  - **Rolnik:** Zarejestruj się → Dodaj produkty i oferty → Otrzymuj zamówienia od klientów

### 4.3 Dla konsumenta
- Section heading + short intro
- 4 benefit cards with icons:
  1. Świeże produkty prosto od rolnika — bez pośredników
  2. Transparentność — wiesz skąd pochodzi żywność
  3. Bezpośredni kontakt z producentem
  4. Lokalne społeczności — grupy, wydarzenia, aktualności

### 4.4 Dla rolnika
- Section heading + short intro
- 4 benefit cards with icons:
  1. Sprzedaż bezpośrednia — większy zysk
  2. Dokumentacja upraw z historią zmian (blockchain-ready)
  3. System opinii i reputacji
  4. Bezpłatna platforma — zero prowizji

### 4.5 ProxyFarmer (Profil-Ambasador)
- Dedicated section explaining the ProxyFarmer concept — unique platform feature
- Explanation: any user can create up to 3 "proxy profiles" on behalf of farmers who are not registered on the platform (e.g., a neighbor, family member, or market regular who wants to help a local farmer get discovered)
- A proxy profile contains: farmer name, location, contact methods (phone/email/in-person/pickup), and a product list
- Other users can browse and follow proxy profiles
- CTA: "Dodaj rolnika" (visible to logged-in users only, or leading to register for guests)

### 4.6 Funkcjonalności
- Grid of 6 feature cards (icon + title + 1-line description):
  1. Marketplace — przeglądaj i zamawiaj lokalne produkty
  2. Social feed — aktualności od rolników których obserwujesz
  3. Grupy i wydarzenia — lokalne społeczności i targi
  4. Czat — bezpośrednia komunikacja z rolnikiem
  5. Dokumentacja upraw — przejrzysta historia produkcji
  6. Opinie i reputacja — zaufany system ocen

### 4.7 App preview
- Visual mockup or static screenshot showing the app UI
- Framed in a phone/browser chrome for context
- Placeholder image (`/public/images/app-preview.png`) on first deploy — real screenshot added later
- Caption: short tagline

### 4.8 FAQ
- Accordion (shadcn `Accordion` component), 6 questions:
  1. Czy platforma jest bezpłatna?
  2. Jak złożyć zamówienie?
  3. Jak dodać swoją ofertę jako rolnik?
  4. Co to jest ProxyFarmer i jak go dodać?
  5. Jak działają opinie i reputacja?
  6. Czy moje dane są bezpieczne?

### 4.9 Footer (in layout)
- Logo + tagline
- Links: Regulamin (`/terms`), Polityka prywatności (`/privacy`)

---

## 5. i18n

New `landing` namespace in `messages/pl.json` with keys for all section headings, body text, CTA labels, FAQ questions and answers, and benefit/feature descriptions.

---

## 6. Styling

- Follows existing shadcn/ui + Tailwind CSS patterns
- All colors via CSS variables (no hardcoded values)
- Full-width sections with alternating background (`background` / `muted`) for visual rhythm
- Responsive: mobile-first, single column → multi-column on md+
- Both light and dark themes must look correct

---

## 7. Out of scope

- No animations or scroll effects (keep it simple for now)
- No contact form
- No real screenshots (placeholder used initially)
- No A/B testing or analytics
- No payment/monetization content (per CLAUDE.md no-go decisions)
