# Location Cascade Filter — Design Spec

**Date:** 2026-04-15
**Status:** Approved

## Problem

Filtering farmers and products by location only supports województwo. Powiat and gmina are missing. Profile settings use free-text inputs for powiat/gmina, leading to inconsistent data. We need cascading dropdowns (województwo → powiat → gmina) everywhere location is set or filtered.

## Scope

1. Static TERYT dataset in the geo domain
2. Reusable `LocationCascade` component (two modes: form and filter)
3. Profile settings — replace text inputs with the cascade
4. Marketplace — add powiat/gmina to existing filtering
5. Farmers page — add location filtering (currently none)

## Out of Scope

- Fixing existing geocoded data in DB (users will update their own profiles)
- Proxy farmer location filtering (no location columns on proxy farmers)
- Listing-level location (products inherit farmer's location as-is)

---

## 1. Data Layer

### `src/domains/geo/teryt.ts`

Static file containing the full Polish administrative hierarchy:

```ts
const TERYT: Record<string, Record<string, string[]>> = {
  "dolnoslaskie": {
    "bolesławiecki": ["Bolesławiec", "Gromadka", "Nowogrodziec", ...],
    ...
  },
  // 16 województw, ~380 powiatów, ~2500 gmin
}

export function getPowiats(voivodeship: string): string[]
export function getGminas(voivodeship: string, powiat: string): string[]
```

Values must use the same spelling as what the geocoder writes to `users.county` / `users.commune`. Existing mismatches are acceptable — data normalises as users update their profiles.

### `src/domains/geo/index.ts`

Add exports: `getPowiats`, `getGminas`, `LocationCascade`.

---

## 2. Component: `LocationCascade`

**File:** `src/domains/geo/components/location-cascade.tsx`
**Type:** Client component

```ts
interface LocationValue {
  voivodeship: string | null
  county: string | null
  commune: string | null
}

interface LocationCascadeProps {
  mode: "filter" | "form"
  value: LocationValue
  onChange: (value: LocationValue) => void
}
```

### Cascade behaviour

- Voivodeship change → clear county and commune, repopulate county options from TERYT
- County change → clear commune, repopulate commune options from TERYT
- Commune change → update commune only

### Mode differences

| | `"form"` | `"filter"` |
|---|---|---|
| "All" option | No | Yes (`null`) |
| Wrappers | `FormItem` + `FormLabel` | Plain `div` |
| Integration | Controlled via `onChange` → `form.setValue` | Controlled via `onChange` → URL params |

Both modes use the same TERYT data and the same shadcn `Select` components.

---

## 3. Profile Settings

**File:** `src/domains/auth/components/profile-form.tsx`

Replace:
- Select for `voivodeship`
- `Input` for `county`
- `Input` for `commune`

With:
```tsx
<LocationCascade
  mode="form"
  value={{
    voivodeship: form.watch("voivodeship"),
    county: form.watch("county"),
    commune: form.watch("commune"),
  }}
  onChange={({ voivodeship, county, commune }) => {
    form.setValue("voivodeship", voivodeship)
    form.setValue("county", county)
    form.setValue("commune", commune)
  }}
/>
```

**`src/domains/auth/schemas/validation.ts`** — no changes. `profileSchema` already has all three fields.
**`src/domains/auth/actions/update-profile.ts`** — no changes.

---

## 4. Marketplace Filtering (Products)

### Schema — `src/domains/marketplace/schemas/validation.ts`

Add to `searchListingsSchema`:
```ts
county: z.string().optional(),
commune: z.string().optional(),
```

### Query — `src/domains/marketplace/queries/get-listings.ts`

Add conditions:
```ts
if (filters.county)  conditions.push(eq(users.county,  filters.county))
if (filters.commune) conditions.push(eq(users.commune, filters.commune))
```

### UI — `src/domains/marketplace/components/search-filters.tsx`

Replace the standalone voivodeship `Select` with `<LocationCascade mode="filter" ...>` reading from and writing to URL params (`voivodeship`, `county`, `commune`). Category, method and sort selects are unchanged.

---

## 5. Farmers Page Filtering

### New query — `src/domains/marketplace/queries/get-farmers.ts`

Extracts the inline DB query from `farmers/page.tsx` and adds filter support:

```ts
interface FarmerFilters {
  voivodeship?: string
  county?: string
  commune?: string
}

export async function getFarmers(filters: FarmerFilters): Promise<FarmerItem[]>
```

Filters apply only to regular farmers (joined from `users`). Proxy farmers are always returned unfiltered — they have no location columns.

### Schema — `src/domains/marketplace/schemas/validation.ts`

Add:
```ts
export const searchFarmersSchema = z.object({
  voivodeship: z.string().optional(),
  county: z.string().optional(),
  commune: z.string().optional(),
})
export type SearchFarmersInput = z.infer<typeof searchFarmersSchema>
```

### Page — `src/app/[locale]/(main)/farmers/page.tsx`

- Parse `searchParams` through `searchFarmersSchema`
- Call `getFarmers(filters)` instead of inline query
- Render `<LocationCascade mode="filter" ...>` above the farmer list (inside `Suspense`)

---

## Data Flow

```
User selects województwo
  → LocationCascade reads getPowiats(voivodeship) from TERYT
  → renders powiat dropdown

User selects powiat
  → LocationCascade reads getGminas(voivodeship, powiat) from TERYT
  → renders gmina dropdown

Filter mode: values written to URL params → page re-renders → query filtered
Form mode:   values written to form state → saved on submit → stored in users table
```

---

## File Changelist

| File | Change |
|------|--------|
| `src/domains/geo/teryt.ts` | New — TERYT data + helper functions |
| `src/domains/geo/components/location-cascade.tsx` | New — reusable cascade component |
| `src/domains/geo/index.ts` | Export new symbols |
| `src/domains/auth/components/profile-form.tsx` | Replace 3 fields with LocationCascade |
| `src/domains/marketplace/schemas/validation.ts` | Add county/commune to listings schema; add farmers schema |
| `src/domains/marketplace/queries/get-listings.ts` | Add county/commune filter conditions |
| `src/domains/marketplace/queries/get-farmers.ts` | New — extracted + filterable farmer query |
| `src/domains/marketplace/components/search-filters.tsx` | Replace voivodeship select with LocationCascade |
| `src/app/[locale]/(main)/farmers/page.tsx` | Add search params + LocationCascade filter UI |
