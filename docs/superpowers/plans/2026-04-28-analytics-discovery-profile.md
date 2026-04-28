# Analytics: Discovery & Profile Events — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 typed analytics events (search.performed, filter.applied, map.viewed, producer_profile.viewed, listing.shared) to the existing Umami analytics domain.

**Architecture:** Extend `types.ts` and `events.ts` in the analytics domain, then add `useAnalytics()` callsites to 4 existing client components. No new files, no infrastructure changes.

**Tech Stack:** TypeScript, React, Vitest, @testing-library/react, next-intl, next/navigation

---

## Files touched

| File | Change |
|------|--------|
| `src/domains/analytics/types.ts` | Add 5 new event type entries |
| `src/domains/analytics/events.ts` | Add 5 new EVENTS constants |
| `src/domains/social/components/share-button.tsx` | Add `listing.shared` callsite |
| `src/domains/marketplace/components/farmer-profile-view.tsx` | Add `producer_profile.viewed` callsite |
| `src/domains/marketplace/components/farmer-map.tsx` | Add `map.viewed` callsite |
| `src/domains/marketplace/components/search-filters.tsx` | Add `search.performed` + `filter.applied` callsites |
| `tests/domains/social/components/share-button.test.tsx` | New — tests listing.shared event |
| `tests/domains/marketplace/components/search-filters.test.tsx` | New — tests search.performed event |

---

## Task 1: Extend analytics catalog

**Files:**
- Modify: `src/domains/analytics/types.ts`
- Modify: `src/domains/analytics/events.ts`

- [ ] **Step 1.1: Add new event types**

Replace full contents of `src/domains/analytics/types.ts`:

```ts
export type EventProperties = {
  "auth.registered": { method: "email" | "google" | "facebook" };
  "auth.logged_in": { method: "email" | "google" | "facebook" };
  "auth.logged_out": undefined;
  "listing.viewed": { listingId: string; farmerId: string; category: string };
  "listing.created": { listingId: string; category: string; hasAvailability: boolean };
  "listing.availability_updated": { listingId: string; availability: string };
  "cart.item_added": { listingId: string; farmerId: string; price: number };
  "cart.item_removed": { listingId: string };
  "order.placed": { orderId: string; farmerId: string; itemCount: number; totalValue: number };
  "order.status_changed": { orderId: string; fromStatus: string; toStatus: string };
  "post.created": { hasMedia: boolean };
  "post.liked": undefined;
  "group.joined": { groupId: string };
  "event.rsvp": { eventId: string };
  "conversation.started": { recipientRole: string };
  "message.sent": undefined;
  "role.upgraded_to_farmer": undefined;
  "search.performed": { query: string };
  "filter.applied": { filterType: "category" | "method" | "sort" | "location"; value: string };
  "map.viewed": { farmerCount: number };
  "producer_profile.viewed": { farmerId: string };
  "listing.shared": { entityType: "FARMER" | "EVENT" | "CROP_LOG" | "PRODUCT" | "PROXY_FARMER"; entityId: string };
};

export type EventName = keyof EventProperties;
```

- [ ] **Step 1.2: Add new EVENTS constants**

Replace full contents of `src/domains/analytics/events.ts`:

```ts
import type { EventName } from "./types";

export const EVENTS = {
  AUTH_REGISTERED: "auth.registered",
  AUTH_LOGGED_IN: "auth.logged_in",
  AUTH_LOGGED_OUT: "auth.logged_out",
  LISTING_VIEWED: "listing.viewed",
  LISTING_CREATED: "listing.created",
  LISTING_AVAILABILITY_UPDATED: "listing.availability_updated",
  CART_ITEM_ADDED: "cart.item_added",
  CART_ITEM_REMOVED: "cart.item_removed",
  ORDER_PLACED: "order.placed",
  ORDER_STATUS_CHANGED: "order.status_changed",
  POST_CREATED: "post.created",
  POST_LIKED: "post.liked",
  GROUP_JOINED: "group.joined",
  EVENT_RSVP: "event.rsvp",
  CONVERSATION_STARTED: "conversation.started",
  MESSAGE_SENT: "message.sent",
  ROLE_UPGRADED_TO_FARMER: "role.upgraded_to_farmer",
  SEARCH_PERFORMED: "search.performed",
  FILTER_APPLIED: "filter.applied",
  MAP_VIEWED: "map.viewed",
  PRODUCER_PROFILE_VIEWED: "producer_profile.viewed",
  LISTING_SHARED: "listing.shared",
} as const satisfies Record<string, EventName>;
```

- [ ] **Step 1.3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 1.4: Commit**

```bash
git add src/domains/analytics/types.ts src/domains/analytics/events.ts
git commit -m "feat(analytics): add discovery and profile event types"
```

---

## Task 2: listing.shared — share-button.tsx

**Files:**
- Modify: `src/domains/social/components/share-button.tsx`
- Create: `tests/domains/social/components/share-button.test.tsx`

- [ ] **Step 2.1: Write failing test**

Create `tests/domains/social/components/share-button.test.tsx`:

```tsx
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockTrackEvent = vi.fn();
vi.mock("@/domains/analytics", () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
  EVENTS: { LISTING_SHARED: "listing.shared" },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ShareButton", () => {
  it("fires listing.shared with entityType and entityId before routing", async () => {
    const { ShareButton } = await import(
      "@/domains/social/components/share-button"
    );
    render(<ShareButton entityType="FARMER" entityId="farmer-123" />);
    await userEvent.click(screen.getByRole("button"));
    expect(mockTrackEvent).toHaveBeenCalledWith("listing.shared", {
      entityType: "FARMER",
      entityId: "farmer-123",
    });
    expect(mockPush).toHaveBeenCalledWith(
      "/social?shareType=FARMER&shareId=farmer-123"
    );
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
npx vitest run tests/domains/social/components/share-button.test.tsx
```

Expected: FAIL — `mockTrackEvent` not called.

- [ ] **Step 2.3: Add callsite to share-button.tsx**

Replace full contents of `src/domains/social/components/share-button.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Share2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useAnalytics, EVENTS } from "@/domains/analytics";

interface ShareButtonProps {
  entityType: "FARMER" | "EVENT" | "CROP_LOG" | "PRODUCT" | "PROXY_FARMER";
  entityId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
}

export function ShareButton({
  entityType,
  entityId,
  variant = "outline",
  size = "sm",
}: ShareButtonProps) {
  const t = useTranslations("social");
  const router = useRouter();
  const { trackEvent } = useAnalytics();

  function handleShare() {
    trackEvent(EVENTS.LISTING_SHARED, { entityType, entityId });
    router.push(`/social?shareType=${entityType}&shareId=${entityId}`);
  }

  return (
    <Button variant={variant} size={size} onClick={handleShare} className="gap-1.5">
      <Share2 className="h-4 w-4" />
      {size !== "icon" && t("share")}
    </Button>
  );
}
```

- [ ] **Step 2.4: Run test to verify it passes**

```bash
npx vitest run tests/domains/social/components/share-button.test.tsx
```

Expected: PASS.

- [ ] **Step 2.5: Commit**

```bash
git add src/domains/social/components/share-button.tsx tests/domains/social/components/share-button.test.tsx
git commit -m "feat(analytics): track listing.shared in ShareButton"
```

---

## Task 3: producer_profile.viewed — farmer-profile-view.tsx

**Files:**
- Modify: `src/domains/marketplace/components/farmer-profile-view.tsx`

Note: this component has heavy props (User, ListingWithDetails[], etc.) making a full RTL test impractical. The event fires on mount — verified visually in Umami dashboard after deploy.

- [ ] **Step 3.1: Add useAnalytics import and useEffect callsite**

In `src/domains/marketplace/components/farmer-profile-view.tsx`:

Add to imports at top:
```tsx
import { useEffect } from "react";
import { useAnalytics, EVENTS } from "@/domains/analytics";
```

Add inside the `FarmerProfileView` function, after the `const isOwnProfile = ...` line:
```tsx
const { trackEvent } = useAnalytics();

useEffect(() => {
  trackEvent(EVENTS.PRODUCER_PROFILE_VIEWED, { farmerId: farmer.id });
}, []);  // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3.3: Commit**

```bash
git add src/domains/marketplace/components/farmer-profile-view.tsx
git commit -m "feat(analytics): track producer_profile.viewed on mount"
```

---

## Task 4: map.viewed — farmer-map.tsx

**Files:**
- Modify: `src/domains/marketplace/components/farmer-map.tsx`

Note: component uses Leaflet dynamic imports and navigator.geolocation — not practical to unit test. Verified in Umami dashboard.

- [ ] **Step 4.1: Add useAnalytics import and callsite**

In `src/domains/marketplace/components/farmer-map.tsx`:

Add to imports at top:
```tsx
import { useAnalytics, EVENTS } from "@/domains/analytics";
```

Inside `FarmerMap`, after `const resolved = useMemo(...)`:
```tsx
const { trackEvent } = useAnalytics();
```

Replace the existing `useEffect` that sets `mapReady`:
```tsx
useEffect(() => {
  setMapReady(true);
  trackEvent(EVENTS.MAP_VIEWED, { farmerCount: resolved.length });
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4.2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4.3: Commit**

```bash
git add src/domains/marketplace/components/farmer-map.tsx
git commit -m "feat(analytics): track map.viewed on mount"
```

---

## Task 5: search.performed + filter.applied — search-filters.tsx

**Files:**
- Modify: `src/domains/marketplace/components/search-filters.tsx`
- Create: `tests/domains/marketplace/components/search-filters.test.tsx`

- [ ] **Step 5.1: Write failing test**

Create `tests/domains/marketplace/components/search-filters.test.tsx`:

```tsx
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/pl/marketplace",
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/domains/geo", () => ({
  LocationCascade: () => null,
}));

const mockTrackEvent = vi.fn();
vi.mock("@/domains/analytics", () => ({
  useAnalytics: () => ({ trackEvent: mockTrackEvent }),
  EVENTS: {
    SEARCH_PERFORMED: "search.performed",
    FILTER_APPLIED: "filter.applied",
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SearchFilters", () => {
  it("fires search.performed with query on form submit", async () => {
    const { SearchFilters } = await import(
      "@/domains/marketplace/components/search-filters"
    );
    render(<SearchFilters categories={[]} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "jabłka");
    await userEvent.click(screen.getByRole("button", { name: "filters" }));
    expect(mockTrackEvent).toHaveBeenCalledWith("search.performed", {
      query: "jabłka",
    });
  });
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npx vitest run tests/domains/marketplace/components/search-filters.test.tsx
```

Expected: FAIL — `mockTrackEvent` not called.

- [ ] **Step 5.3: Add callsites to search-filters.tsx**

Replace full contents of `src/domains/marketplace/components/search-filters.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import { LocationCascade, type LocationValue } from "@/domains/geo";
import type { Category } from "@/shared/db/schema";
import { useAnalytics, EVENTS } from "@/domains/analytics";

interface SearchFiltersProps {
  categories: Category[];
}

type FilterType = "category" | "method" | "sort" | "location";

export function SearchFilters({ categories }: SearchFiltersProps) {
  const t = useTranslations("marketplace");
  const tProduct = useTranslations("product");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { trackEvent } = useAnalytics();

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
      if (key !== "q" && value && value !== "all") {
        trackEvent(EVENTS.FILTER_APPLIED, {
          filterType: key as FilterType,
          value,
        });
      }
    },
    [searchParams, pathname, router, trackEvent]
  );

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q") as string;
    updateParams("q", query);
    trackEvent(EVENTS.SEARCH_PERFORMED, { query });
  }

  function clearFilters() {
    router.push(pathname);
  }

  function handleLocationChange(loc: LocationValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (loc.voivodeship) {
      params.set("voivodeship", loc.voivodeship);
    } else {
      params.delete("voivodeship");
    }
    if (loc.county) {
      params.set("county", loc.county);
    } else {
      params.delete("county");
    }
    if (loc.commune) {
      params.set("commune", loc.commune);
    } else {
      params.delete("commune");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
    const locationValue = loc.commune ?? loc.county ?? loc.voivodeship;
    if (locationValue) {
      trackEvent(EVENTS.FILTER_APPLIED, {
        filterType: "location",
        value: locationValue,
      });
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          name="q"
          placeholder={t("search")}
          defaultValue={searchParams.get("q") ?? ""}
          className="flex-1"
        />
        <Button type="submit" size="sm">
          {t("filters")}
        </Button>
      </form>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        <Select
          value={searchParams.get("category") ?? "all"}
          onValueChange={(v) => updateParams("category", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("allCategories")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allCategories")}</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.slug}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <LocationCascade
          mode="filter"
          value={{
            voivodeship: searchParams.get("voivodeship"),
            county: searchParams.get("county"),
            commune: searchParams.get("commune"),
          }}
          onChange={handleLocationChange}
        />

        <Select
          value={searchParams.get("method") ?? "all"}
          onValueChange={(v) => updateParams("method", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={tProduct("method")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{tProduct("method")}</SelectItem>
            <SelectItem value="ECO">{tProduct("methodEco")}</SelectItem>
            <SelectItem value="CONVENTIONAL">
              {tProduct("methodConventional")}
            </SelectItem>
            <SelectItem value="OTHER">{tProduct("methodOther")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("sort") ?? "newest"}
          onValueChange={(v) => updateParams("sort", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder={t("sortBy")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("sortNewest")}</SelectItem>
            <SelectItem value="price_asc">{t("sortPriceAsc")}</SelectItem>
            <SelectItem value="price_desc">{t("sortPriceDesc")}</SelectItem>
            <SelectItem value="name">{t("sortName")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {searchParams.toString() && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 5.4: Run test to verify it passes**

```bash
npx vitest run tests/domains/marketplace/components/search-filters.test.tsx
```

Expected: PASS.

- [ ] **Step 5.5: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5.6: Commit**

```bash
git add src/domains/marketplace/components/search-filters.tsx tests/domains/marketplace/components/search-filters.test.tsx
git commit -m "feat(analytics): track search.performed and filter.applied"
```

---

## Done

All 5 events are implemented and wired. Verify in Umami dashboard:
- Search the marketplace → `search.performed` event appears
- Change a filter → `filter.applied` event appears
- Open the farmer map tab → `map.viewed` event appears
- Visit a farmer profile → `producer_profile.viewed` event appears
- Click Share on any entity → `listing.shared` event appears
