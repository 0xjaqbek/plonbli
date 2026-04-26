# UX Feedback: Button Loading States & Notification Badge Clearing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add visual loading feedback to all action buttons and make notification badges (messages/orders) clear automatically after the user reads them — without a full page refresh.

**Architecture:** A new `isLoading` prop on the shared `Button` component shows a spinner during Server Actions. A client-side `BadgeContext` initialized from server data holds the badge state; components call `clearUnread()` / `clearUnseenOrders()` after their mark-as-read actions succeed.

**Tech Stack:** Next.js 15 App Router, React context, Vitest + Testing Library, Lucide icons, shadcn/ui Button (CVA)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/shared/ui/button.tsx` | Modify | Add `isLoading` prop with Loader2 spinner |
| `src/shared/lib/badge-context.tsx` | Create | BadgeContext provider + useBadges hook |
| `src/app/[locale]/(main)/layout.tsx` | Modify | Wrap children in BadgeProvider |
| `src/shared/ui/nav-bar.tsx` | Modify | Read badges from useBadges() instead of props |
| `src/domains/messaging/components/chat-view.tsx` | Modify | clearUnread() after markAsRead + isLoading |
| `src/domains/orders/components/order-detail/order-detail.tsx` | Modify | clearUnseenOrders() on mount + isLoading |
| `src/domains/orders/components/farmer-dashboard/farmer-order-detail.tsx` | Modify | clearUnseenOrders() on mount + isLoading |
| `src/domains/auth/components/login-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/auth/components/register-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/auth/components/profile-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/marketplace/components/product-detail.tsx` | Modify | isLoading={isPending} |
| `src/domains/marketplace/components/availability-select.tsx` | Modify | isLoading={isPending} |
| `src/domains/marketplace/components/listing-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/marketplace/components/listing-card-actions.tsx` | Modify | isLoading={isPending} |
| `src/domains/marketplace/components/proxy-farmer-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/orders/components/checkout/checkout-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/orders/components/cart/cart-item-row.tsx` | Modify | isLoading={isPending} |
| `src/domains/orders/components/farmer-dashboard/payment-methods-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/orders/components/farmer-dashboard/pickup-schedule-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/orders/components/order-detail/modification-review.tsx` | Modify | isLoading={isPending} |
| `src/domains/orders/components/order-detail/payment-proof-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/social/components/rsvp-button.tsx` | Modify | isLoading={isPending} |
| `src/domains/social/components/post-card.tsx` | Modify | isLoading={isPending} |
| `src/domains/social/components/group-header.tsx` | Modify | isLoading={isPending} |
| `src/domains/social/components/proxy-farmer-follow-button.tsx` | Modify | isLoading={isPending} |
| `src/domains/social/components/event-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/social/components/user-follow-button.tsx` | Modify | isLoading={isPending} |
| `src/domains/social/components/comment-form.tsx` | Modify | isLoading={isPending} |
| `src/app/[locale]/(main)/social/groups/[id]/collections/[collectionId]/status-update-button.tsx` | Modify | isLoading={isPending} |
| `src/app/[locale]/(main)/social/events/[id]/delete-button.tsx` | Modify | isLoading={isPending} |
| `src/app/[locale]/(main)/social/groups/create/page.tsx` | Modify | isLoading={isPending} |
| `src/domains/messaging/components/new-conversation-dialog.tsx` | Modify | isLoading={isPending} |
| `src/domains/farming/components/crop-log-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/logistics/components/collection-join-button.tsx` | Modify | isLoading={isPending} |
| `src/domains/logistics/components/collection-form.tsx` | Modify | isLoading={isPending} |
| `src/domains/logistics/components/pickup-point-form.tsx` | Modify | isLoading={isPending} |
| `tests/shared/ui/button.test.tsx` | Create | Component test for isLoading |
| `tests/shared/lib/badge-context.test.tsx` | Create | Unit test for BadgeContext |

---

## Task 1: Button `isLoading` prop

**Files:**
- Modify: `src/shared/ui/button.tsx`
- Create: `tests/shared/ui/button.test.tsx`

### isLoading behavior

- When `isLoading={true}`: button is `disabled`, shows `<Loader2 className="animate-spin" />` spinner
- For icon-only sizes (`icon`, `icon-sm`, `icon-lg`, `icon-xs`): spinner replaces children entirely
- For text sizes: spinner appears before children (existing `gap-2` in CVA handles spacing)

- [ ] **Step 1: Write the failing test**

Create `tests/shared/ui/button.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/shared/ui/button";

describe("Button isLoading", () => {
  it("shows spinner and is disabled when isLoading=true", () => {
    render(<Button isLoading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(document.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("shows children text when isLoading=true for non-icon buttons", () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("hides children when isLoading=true for icon buttons", () => {
    render(<Button isLoading size="icon">X</Button>);
    expect(screen.queryByText("X")).toBeNull();
    expect(document.querySelector("svg.animate-spin")).toBeTruthy();
  });

  it("renders normally when isLoading=false", () => {
    render(<Button isLoading={false}>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).not.toBeDisabled();
    expect(document.querySelector("svg.animate-spin")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/shared/ui/button.test.tsx
```

Expected: FAIL — `isLoading` prop doesn't exist yet.

- [ ] **Step 3: Implement isLoading in button.tsx**

Replace the entire `src/shared/ui/button.tsx` with:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { Loader2 } from "lucide-react"

import { cn } from "@/shared/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const ICON_SIZES = new Set(["icon", "icon-sm", "icon-lg", "icon-xs"])

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  isLoading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    isLoading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  const isIconSize = ICON_SIZES.has(size ?? "default")

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        isIconSize ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <Loader2 className="animate-spin" />
            {children}
          </>
        )
      ) : (
        children
      )}
    </Comp>
  )
}

export { Button, buttonVariants }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/shared/ui/button.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/ui/button.tsx tests/shared/ui/button.test.tsx
git commit -m "feat(ui): add isLoading prop to Button with Loader2 spinner"
```

---

## Task 2: BadgeContext

**Files:**
- Create: `src/shared/lib/badge-context.tsx`
- Create: `tests/shared/lib/badge-context.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/shared/lib/badge-context.test.tsx`:

```tsx
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BadgeProvider, useBadges } from "@/shared/lib/badge-context";

function TestComponent() {
  const { hasUnread, hasUnseenOrders, clearUnread, clearUnseenOrders } = useBadges();
  return (
    <div>
      <span data-testid="unread">{String(hasUnread)}</span>
      <span data-testid="unseen">{String(hasUnseenOrders)}</span>
      <button onClick={clearUnread}>clearUnread</button>
      <button onClick={clearUnseenOrders}>clearUnseen</button>
    </div>
  );
}

describe("BadgeContext", () => {
  it("initializes with provided values", () => {
    render(
      <BadgeProvider initialUnread={true} initialUnseenOrders={true}>
        <TestComponent />
      </BadgeProvider>
    );
    expect(screen.getByTestId("unread").textContent).toBe("true");
    expect(screen.getByTestId("unseen").textContent).toBe("true");
  });

  it("clearUnread sets hasUnread to false", async () => {
    render(
      <BadgeProvider initialUnread={true} initialUnseenOrders={false}>
        <TestComponent />
      </BadgeProvider>
    );
    await act(async () => {
      screen.getByText("clearUnread").click();
    });
    expect(screen.getByTestId("unread").textContent).toBe("false");
  });

  it("clearUnseenOrders sets hasUnseenOrders to false", async () => {
    render(
      <BadgeProvider initialUnread={false} initialUnseenOrders={true}>
        <TestComponent />
      </BadgeProvider>
    );
    await act(async () => {
      screen.getByText("clearUnseen").click();
    });
    expect(screen.getByTestId("unseen").textContent).toBe("false");
  });

  it("throws when useBadges is used outside BadgeProvider", () => {
    const original = console.error;
    console.error = () => {};
    expect(() => render(<TestComponent />)).toThrow();
    console.error = original;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run tests/shared/lib/badge-context.test.tsx
```

Expected: FAIL — `badge-context` module not found.

- [ ] **Step 3: Create badge-context.tsx**

Create `src/shared/lib/badge-context.tsx`:

```tsx
"use client";

import { createContext, useContext, useState } from "react";

interface BadgeState {
  hasUnread: boolean;
  hasUnseenOrders: boolean;
  clearUnread: () => void;
  clearUnseenOrders: () => void;
}

const BadgeContext = createContext<BadgeState | null>(null);

export function BadgeProvider({
  children,
  initialUnread,
  initialUnseenOrders,
}: {
  children: React.ReactNode;
  initialUnread: boolean;
  initialUnseenOrders: boolean;
}) {
  const [hasUnread, setHasUnread] = useState(initialUnread);
  const [hasUnseenOrders, setHasUnseenOrders] = useState(initialUnseenOrders);

  return (
    <BadgeContext.Provider
      value={{
        hasUnread,
        hasUnseenOrders,
        clearUnread: () => setHasUnread(false),
        clearUnseenOrders: () => setHasUnseenOrders(false),
      }}
    >
      {children}
    </BadgeContext.Provider>
  );
}

export function useBadges(): BadgeState {
  const ctx = useContext(BadgeContext);
  if (!ctx) throw new Error("useBadges must be used within BadgeProvider");
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run tests/shared/lib/badge-context.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/badge-context.tsx tests/shared/lib/badge-context.test.tsx
git commit -m "feat(shared): add BadgeContext for client-side notification badge state"
```

---

## Task 3: Wire BadgeContext into Layout and NavBar

**Files:**
- Modify: `src/app/[locale]/(main)/layout.tsx`
- Modify: `src/shared/ui/nav-bar.tsx`

- [ ] **Step 1: Update layout.tsx**

Replace the content of `src/app/[locale]/(main)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { auth } from "@/domains/auth/lib/auth";
import { NavBar } from "@/shared/ui/nav-bar";
import { hasUnreadMessages } from "@/domains/messaging/queries/has-unread-messages";
import { hasUnseenOrderChanges } from "@/domains/orders/queries/has-unseen-order-changes";
import { PushPermissionPrompt } from "@/domains/notifications/components/push-permission-prompt";
import { ForegroundMessageHandler } from "@/domains/notifications/components/foreground-message-handler";
import { BadgeProvider } from "@/shared/lib/badge-context";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  const [hasUnread, hasUnseenOrders] = await Promise.all([
    hasUnreadMessages(session.user!.id!),
    hasUnseenOrderChanges(session.user!.id!),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <BadgeProvider initialUnread={hasUnread} initialUnseenOrders={hasUnseenOrders}>
        <NavBar />
        <main className="pb-20 md:pb-0">{children}</main>
      </BadgeProvider>
      <PushPermissionPrompt />
      <ForegroundMessageHandler />
    </div>
  );
}
```

- [ ] **Step 2: Update nav-bar.tsx**

Replace the content of `src/shared/ui/nav-bar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Home, ShoppingBasket, Tractor, Users, MessageCircle, User, ShoppingCart, Package } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useBadges } from "@/shared/lib/badge-context";

const bottomNavItems = [
  { href: "/", icon: Home, labelKey: "home" as const },
  { href: "/marketplace", icon: ShoppingBasket, labelKey: "marketplace" as const },
  { href: "/farmers", icon: Tractor, labelKey: "farmers" as const },
  { href: "/social", icon: Users, labelKey: "social" as const },
];

const topRightItems = [
  { href: "/orders", icon: Package, labelKey: "orders" as const },
  { href: "/marketplace/cart", icon: ShoppingCart, labelKey: "cart" as const },
  { href: "/messages", icon: MessageCircle, labelKey: "messages" as const },
  { href: "/profile", icon: User, labelKey: "profile" as const },
];

const allNavItems = [...bottomNavItems, ...topRightItems];

export function NavBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { hasUnread, hasUnseenOrders } = useBadges();

  // Strip locale prefix for comparison
  const cleanPath = pathname.replace(/^\/[a-z]{2}(?:\/|$)/, "/");

  function isActive(href: string) {
    if (href === "/") return cleanPath === "/";
    return cleanPath.startsWith(href);
  }

  return (
    <>
      {/* Desktop top bar */}
      <header className="hidden md:flex items-center justify-between border-b px-6 py-3">
        <Link href="/" className="text-xl font-bold text-primary">
          plonbli
        </Link>
        <nav className="flex items-center gap-1">
          {allNavItems.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                isActive(href)
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <span className="relative">
                <Icon className="h-4 w-4" />
                {hasUnread && href === "/messages" && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
                {hasUnseenOrders && href === "/orders" && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </span>
              {t(labelKey)}
            </Link>
          ))}
        </nav>
      </header>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 flex items-center justify-between border-b bg-background px-4 py-2.5 z-50">
        <Link href="/" className="text-lg font-bold text-primary">
          plonbli
        </Link>
        <div className="flex items-center gap-1">
          {topRightItems.map(({ href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative p-2 rounded-md transition-colors",
                isActive(href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {hasUnread && href === "/messages" && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              )}
              {hasUnseenOrders && href === "/orders" && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              )}
            </Link>
          ))}
        </div>
      </header>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background z-50">
        <div className="flex items-center justify-around h-14">
          {bottomNavItems.map(({ href, icon: Icon, labelKey }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 text-[10px] transition-colors",
                isActive(href)
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

- [ ] **Step 3: Run tests to confirm nothing broken**

```bash
npx vitest run
```

Expected: all existing tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/[locale]/\(main\)/layout.tsx src/shared/ui/nav-bar.tsx
git commit -m "feat(nav): wire BadgeContext into layout and NavBar"
```

---

## Task 4: Clear unread badge in ChatView

**Files:**
- Modify: `src/domains/messaging/components/chat-view.tsx`

- [ ] **Step 1: Update the markAsRead useEffect to await and clear badge**

In `src/domains/messaging/components/chat-view.tsx`:

1. Add import at the top (with other imports):
```tsx
import { useBadges } from "@/shared/lib/badge-context";
```

2. Add inside the component body (after `const { trackEvent } = useAnalytics()`):
```tsx
const { clearUnread } = useBadges();
```

3. Replace the existing mount effect:
```tsx
// Before
useEffect(() => {
  markAsRead(conversationId);
}, [conversationId]);

// After
useEffect(() => {
  const doMark = async () => {
    const result = await markAsRead(conversationId);
    if (result.success) clearUnread();
  };
  doMark();
}, [conversationId]);
```

4. Change the Send button to use `isLoading`:
```tsx
// Before
<Button
  size="icon"
  onClick={handleSend}
  disabled={isPending || !input.trim()}
>

// After
<Button
  size="icon"
  onClick={handleSend}
  isLoading={isPending}
  disabled={!input.trim()}
>
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/domains/messaging/components/chat-view.tsx
git commit -m "feat(messaging): clear unread badge after markAsRead + isLoading on send button"
```

---

## Task 5: Clear unseen-orders badge in OrderDetail and FarmerOrderDetail

**Files:**
- Modify: `src/domains/orders/components/order-detail/order-detail.tsx`
- Modify: `src/domains/orders/components/farmer-dashboard/farmer-order-detail.tsx`

### order-detail.tsx

- [ ] **Step 1: Update order-detail.tsx**

1. Add import:
```tsx
import { useBadges } from "@/shared/lib/badge-context";
```

2. Add inside component body (after `const [isPending, startTransition] = useTransition()`):
```tsx
const { clearUnseenOrders } = useBadges();
```

3. Add a mount effect (add after the existing state declarations):
```tsx
useEffect(() => {
  clearUnseenOrders();
}, []);
```

4. Add `useEffect` to the import line at the top — it already imports `useState, useTransition` from react. Add `useEffect`:
```tsx
import { useState, useEffect, useTransition } from "react";
```

5. Replace all `<Button ... disabled={isPending}` with `<Button ... isLoading={isPending}`:

```tsx
// handleComplete button
<Button onClick={handleComplete} isLoading={isPending} className="flex-1">
  {t("completeOrder")}
</Button>

// handleMessageAboutOrder button
<Button
  variant="outline"
  onClick={handleMessageAboutOrder}
  isLoading={isPending}
  className="flex items-center gap-2"
>
  <MessageCircle className="h-4 w-4" />
  {t("messageToFarmer")}
</Button>

// cancel trigger button (this one has no isPending condition — no isLoading needed)
<Button variant="destructive" onClick={() => setShowCancel(true)} disabled={isPending}>
  {t("cancel")}
</Button>
// Change to:
<Button variant="destructive" onClick={() => setShowCancel(true)} disabled={isPending}>
  {t("cancel")}
</Button>
// Note: this button triggers showing the cancel form, not a Server Action. Keep as disabled.

// Inside cancel form:
<Button variant="destructive" onClick={handleCancel} isLoading={isPending}>
  {t("cancel")}
</Button>
```

### farmer-order-detail.tsx

- [ ] **Step 2: Update farmer-order-detail.tsx**

1. Add import:
```tsx
import { useBadges } from "@/shared/lib/badge-context";
```

2. Add `useEffect` to the react import:
```tsx
import { useState, useEffect, useTransition } from "react";
```

3. Add inside component body (after `const [isPending, startTransition] = useTransition()`):
```tsx
const { clearUnseenOrders } = useBadges();

useEffect(() => {
  clearUnseenOrders();
}, []);
```

4. Replace `disabled={isPending}` with `isLoading={isPending}` on all action buttons. Pattern to apply:

```tsx
// handleConfirm button
<Button onClick={handleConfirm} isLoading={isPending}>

// handleVerifyPayment button
<Button onClick={() => handleVerifyPayment(proof.id)} isLoading={isPending} size="sm">

// handleStatusChange PREPARING button
<Button onClick={() => handleStatusChange("PREPARING")} isLoading={isPending}>

// handleStatusChange READY_FOR_PICKUP button
<Button onClick={() => handleStatusChange("READY_FOR_PICKUP")} isLoading={isPending}>

// handleShip button (has additional disabled condition)
<Button onClick={handleShip} isLoading={isPending} disabled={!trackingNumber}>

// handleCancel button (has additional disabled condition)
<Button variant="destructive" onClick={handleCancel} isLoading={isPending} disabled={!cancelReason}>
```

Note: The "modify" button (`onClick={() => setShowModify(true)}`) and "cancel trigger" (`onClick={() => setShowCancel(true)}`) just show a local form — they don't call Server Actions. Keep them as `disabled={isPending}` (not isLoading).

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/domains/orders/components/order-detail/order-detail.tsx src/domains/orders/components/farmer-dashboard/farmer-order-detail.tsx
git commit -m "feat(orders): clear unseen-orders badge on mount + isLoading on action buttons"
```

---

## Task 6: isLoading on auth + marketplace components

**Files:**
- `src/domains/auth/components/login-form.tsx`
- `src/domains/auth/components/register-form.tsx`
- `src/domains/auth/components/profile-form.tsx`
- `src/domains/marketplace/components/product-detail.tsx`
- `src/domains/marketplace/components/availability-select.tsx`
- `src/domains/marketplace/components/listing-form.tsx`
- `src/domains/marketplace/components/listing-card-actions.tsx`
- `src/domains/marketplace/components/proxy-farmer-form.tsx`

**Pattern:** In each file, for every `<Button ... disabled={isPending}`:
- If `disabled={isPending}` is the only condition → change to `isLoading={isPending}`
- If `disabled={isPending || someOtherCondition}` → change to `isLoading={isPending} disabled={someOtherCondition}`
- Buttons that use `disabled={isPending}` only to prevent interaction (not calling a Server Action, e.g. toggling local state) → keep `disabled={isPending}`, do NOT add isLoading

- [ ] **Step 1: Update auth components**

For each file in `src/domains/auth/components/`, apply the pattern above to all `<Button>` elements. Example for `login-form.tsx`:

```tsx
// Before
<Button type="submit" className="w-full" disabled={isPending}>
  {t("submit")}
</Button>

// After
<Button type="submit" className="w-full" isLoading={isPending}>
  {t("submit")}
</Button>
```

- [ ] **Step 2: Update marketplace components**

Apply the same pattern to all 5 marketplace component files. Example for `listing-card-actions.tsx`:

```tsx
// Before
<Button size="sm" onClick={handleAddToCart} disabled={isPending}>

// After
<Button size="sm" onClick={handleAddToCart} isLoading={isPending}>
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/domains/auth/components/ src/domains/marketplace/components/
git commit -m "feat(ui): isLoading spinner on auth and marketplace action buttons"
```

---

## Task 7: isLoading on orders remaining components

**Files:**
- `src/domains/orders/components/checkout/checkout-form.tsx`
- `src/domains/orders/components/cart/cart-item-row.tsx`
- `src/domains/orders/components/farmer-dashboard/payment-methods-form.tsx`
- `src/domains/orders/components/farmer-dashboard/pickup-schedule-form.tsx`
- `src/domains/orders/components/order-detail/modification-review.tsx`
- `src/domains/orders/components/order-detail/payment-proof-form.tsx`

- [ ] **Step 1: Apply isLoading pattern to all 6 files**

For each file, apply the pattern from Task 6: replace `disabled={isPending}` → `isLoading={isPending}` on buttons that trigger Server Actions. For combined conditions like `disabled={isPending || !value}` → `isLoading={isPending} disabled={!value}`.

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/domains/orders/components/
git commit -m "feat(ui): isLoading spinner on orders action buttons"
```

---

## Task 8: isLoading on social + messaging + farming + logistics components

**Files:**
- `src/domains/social/components/rsvp-button.tsx`
- `src/domains/social/components/post-card.tsx`
- `src/domains/social/components/group-header.tsx`
- `src/domains/social/components/proxy-farmer-follow-button.tsx`
- `src/domains/social/components/event-form.tsx`
- `src/domains/social/components/user-follow-button.tsx`
- `src/domains/social/components/comment-form.tsx`
- `src/app/[locale]/(main)/social/groups/[id]/collections/[collectionId]/status-update-button.tsx`
- `src/app/[locale]/(main)/social/events/[id]/delete-button.tsx`
- `src/app/[locale]/(main)/social/groups/create/page.tsx`
- `src/domains/messaging/components/new-conversation-dialog.tsx`
- `src/domains/farming/components/crop-log-form.tsx`
- `src/domains/logistics/components/collection-join-button.tsx`
- `src/domains/logistics/components/collection-form.tsx`
- `src/domains/logistics/components/pickup-point-form.tsx`

- [ ] **Step 1: Apply isLoading pattern to all 15 files**

For each file, apply the same pattern as Task 6 and Task 7.

- [ ] **Step 2: Run tests**

```bash
npx vitest run
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/domains/social/ src/domains/messaging/components/new-conversation-dialog.tsx src/domains/farming/ src/domains/logistics/ "src/app/[locale]/(main)/social/"
git commit -m "feat(ui): isLoading spinner on social, messaging, farming and logistics buttons"
```

---

## Verification

After all tasks:

- [ ] Run full test suite: `npx vitest run` — all pass
- [ ] Manual check: tap an action button on mobile → spinner appears immediately, button disabled
- [ ] Manual check: open a conversation → red dot on messages icon disappears (after server confirms)
- [ ] Manual check: open an order → red dot on orders icon disappears
- [ ] Manual check: both light and dark themes look correct with spinner
