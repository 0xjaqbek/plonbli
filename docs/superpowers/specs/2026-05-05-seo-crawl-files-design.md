# SEO & Crawl Files: robots.txt, llms.txt, JSON-LD

**Date:** 2026-05-05
**Goal:** Prevent AI and search bots from indexing private app content; provide minimal structured identity data for public pages.

## Context

Plonbli is a closed platform — all main app pages require authentication. Public pages are limited to: `/login`, `/register`, `/privacy`, `/terms`, `/facebook-data-deletion`. The production domain is `plonbli.pl` (currently on `plonbliapp.vercel.app`).

## Approach: Next.js Metadata API + static file

### 1. `src/app/robots.ts` → `/robots.txt`

Uses Next.js `MetadataRoute.Robots` to generate the file at build time.

Rules:
- All user-agents: disallow `/` (entire app)
- Allow only: `/privacy`, `/terms`, `/login`, `/register`
- Sitemap: none (no public content to index)

```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
      allow: ['/privacy', '/terms', '/login', '/register'],
    },
  };
}
```

Note: middleware uses `localePrefix: "never"`, więc URL-e nie mają prefiksu `/pl/`. Ścieżki `/privacy`, `/terms` itp. są finalne.

### 2. `public/llms.txt`

Static text file at `/llms.txt`. Follows the llmstxt.org spec (H1 = app name, blockquote = summary, sections with links).

Content:
- App name and one-line description
- Statement that the app is a private platform requiring authentication
- Links to public legal pages only
- Explicit note: no user data, product listings, or personal information is publicly accessible

### 3. JSON-LD in `src/app/layout.tsx`

Inline `<script type="application/ld+json">` added to root layout `<head>`. Single schema: `WebApplication` + `Organization`.

Fields:
- `@type`: `["WebApplication", "SoftwareApplication"]`
- `name`: "plonbli"
- `description`: "Platforma łącząca rolników z konsumentami"
- `url`: "https://plonbli.pl"
- `applicationCategory`: "BusinessApplication"
- `operatingSystem`: "Web, PWA"
- `inLanguage`: "pl"
- `publisher`: `{ @type: Organization, name: "plonbli", url: "https://plonbli.pl" }`

No user data, no product listings, no pricing — strictly identity-level schema.

## Files to create/modify

| File | Action |
|------|--------|
| `src/app/robots.ts` | Create |
| `public/llms.txt` | Create |
| `src/app/layout.tsx` | Modify (add JSON-LD script tag) |

## Out of scope

- Sitemap (no public indexable content)
- Per-page JSON-LD (all pages are private)
- Dynamic robots rules
- OpenGraph / Twitter cards
