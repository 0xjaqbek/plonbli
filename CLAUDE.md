# Plonbli

Farmer-consumer marketplace + social platform (PWA). Connects local farmers with consumers, eliminates supply chain middlemen.

## Spec

Full design spec: `docs/superpowers/specs/2026-03-27-plonbli-platform-design.md`

## Stack

- **Framework:** Next.js 15 (App Router, Server Actions, Server Components)
- **UI:** shadcn/ui + Tailwind CSS
- **DB:** PostgreSQL + PostGIS (Neon serverless)
- **ORM:** Drizzle
- **Auth:** NextAuth.js v5 (email+password, Google, Facebook)
- **Real-time:** WebSockets (chat) + SSE (feed, notifications)
- **i18n:** next-intl (Polish default)
- **Validation:** Zod
- **PWA:** next-pwa
- **Storage:** Cloudflare R2 (images)

## Architecture

Monolithic Next.js with domain-driven internal structure. All code in `src/`.

```
src/
  app/                    # Next.js routes only — no business logic here
  domains/
    auth/                 # authentication, sessions
    marketplace/          # listings, products, search
    social/               # feed, posts, groups, events
    messaging/            # chat 1:1, group, channels
    farming/              # crop documentation (blockchain-ready)
    reputation/           # reviews, reputation (blockchain-ready)
    logistics/            # delivery, pickup points, coordination
    geo/                  # geolocation, administrative hierarchy
  shared/
    ui/                   # shadcn components, themes
    db/                   # schema, migrations, connection
    lib/                  # utils, types, validation
```

## Key Rules

### Domain structure
- Each domain is self-contained: its own types, actions, components, queries
- Cross-domain imports go through the domain's public API (index.ts barrel export)
- `app/` routes are thin — they import from domains, not the other way around
- `shared/` is the only code imported by multiple domains

### Blockchain-ready domains
- `farming` and `reputation` use **repository pattern** — interface separates logic from storage
- Every CropLog and Review entry gets a SHA-256 `contentHash` and `previousHash` (chain)
- These entries are **immutable** — no edits, only new entries
- Today: `PostgresXxxRepository` implements the interface. Future: swap to blockchain implementation.
- Do NOT bypass the repository interface. All reads/writes go through it.

### Themes
- Two themes: light (earthy/natural) and dark (modern/clean)
- All colors via CSS variables — never hardcode color values in components
- Test both themes when building UI

### i18n
- All user-facing strings in translation files via next-intl — never hardcode Polish text in components
- Polish is default language, but structure must support adding languages without code changes

### Code conventions
- TypeScript strict mode
- Zod schemas for all external input validation (forms, API)
- Shared Zod schemas between frontend and backend — define once in domain, import in both places
- Drizzle for all DB queries — no raw SQL except PostGIS-specific queries where needed
- Server Actions for mutations, Server Components for data fetching where possible
- Prefer composition over abstraction — don't over-engineer

### No-go decisions
- No payment/order system (transactions happen off-platform for now)
- No native app — PWA only
- No AI/automated moderation — manual admin queue for now
- No algorithm-driven feed — chronological only
- No monetization features — free platform, but architecture should not block future monetization
