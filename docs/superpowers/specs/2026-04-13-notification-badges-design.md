# Notification Badges — Wiadomości i Zamówienia

**Data:** 2026-04-13
**Status:** Approved

## Cel

Dodanie wizualnych wskaźników (dot badge) na ikonach wiadomości i zamówień w NavBar, informujących użytkownika o nieodczytanych wiadomościach oraz niewidzianych zmianach statusu zamówień.

## Zakres

- Badge na ikonie wiadomości (już częściowo istnieje — rozszerzenie o kompletność)
- Badge na ikonie zamówień (nowa funkcja)
- Mechanizm "widziany" na poziomie konkretnego zamówienia

## Wygląd

Prosta kropka (identyczna z istniejącą implementacją dla wiadomości):
```
absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive
```
Brak liczników — tylko obecność/nieobecność kropki.

## Baza danych

### Zmiana w schemacie `orders`

Dwie nowe kolumny w tabeli `orders`:

```ts
customerHasSeen: boolean("customer_has_seen").notNull().default(true)
farmerHasSeen:   boolean("farmer_has_seen").notNull().default(true)
```

Wartość domyślna `true` — istniejące zamówienia nie generują fałszywych powiadomień.

### Logika resetowania flag

| Akcja | Kto wykonuje | Flaga do reset |
|-------|-------------|----------------|
| `create-order` | klient | `farmerHasSeen = false` |
| `submit-payment-proof` | klient | `farmerHasSeen = false` |
| `accept-modification` | klient | `farmerHasSeen = false` |
| `cancel-order` | klient | `farmerHasSeen = false` |
| `modify-order` | rolnik | `customerHasSeen = false` |
| `confirm-order` | rolnik | `customerHasSeen = false` |
| `update-order-status` (PREPARING, SHIPPED, READY_FOR_PICKUP) | rolnik | `customerHasSeen = false` |
| `cancel-order` | rolnik | `customerHasSeen = false` |

### Oznaczenie jako "widziane"

Nowa Server Action `markOrderSeen(orderId: string, userId: string)`:
- Sprawdza czy `userId === order.customerId` → ustawia `customerHasSeen = true`
- Sprawdza czy `userId === order.farmerId` → ustawia `farmerHasSeen = true`
- Wywołana na początku renderowania stron szczegółów zamówienia

## Nowe pliki

### `src/domains/orders/queries/has-unseen-order-changes.ts`

Query zwracająca `boolean` — czy istnieje co najmniej jedno zamówienie z niewidzianą zmianą dla danego użytkownika:

```ts
export async function hasUnseenOrderChanges(userId: string): Promise<boolean>
```

Użytkownik może mieć trzy role: `klient`, `rolnik`, lub `klient i rolnik`. W każdym przypadku ta sama query działa poprawnie:
- Klient: ma zamówienia jako `customerId` → sprawdza pierwszą gałąź OR
- Rolnik: ma zamówienia jako `farmerId` → sprawdza drugą gałąź OR
- Klient i rolnik: ma zamówienia w obu rolach → OR zwraca `true` jeśli którakolwiek strona ma niewidziane zmiany

Logika:
- `(customerId = userId AND customerHasSeen = false) OR (farmerId = userId AND farmerHasSeen = false)`
- `.limit(1)` — wystarczy jeden wynik

### `src/domains/orders/actions/mark-order-seen.ts`

Server Action aktualizująca flagę widzenia dla konkretnego zamówienia. Weryfikuje że `userId` jest faktycznie uczestnikiem zamówienia (IDOR protection).

Logika:
- Jeśli `order.customerId === userId` → `customerHasSeen = true`
- Jeśli `order.farmerId === userId` → `farmerHasSeen = true`
- Warunki są niezależne — użytkownik z rolą "klient i rolnik" otwierający swoje zamówienie jako klient oznaczy tylko `customerHasSeen`

## Zmodyfikowane pliki

### `src/shared/db/schema/orders.ts`
Dodanie dwóch kolumn `customerHasSeen` i `farmerHasSeen`.

### `src/domains/orders/actions/` (akcje zmieniające status)
Każda akcja resetuje odpowiednią flagę przy zmianie statusu — `create-order`, `submit-payment-proof`, `accept-modification`, `modify-order`, `confirm-order`, `update-order-status`, `cancel-order`.

### `src/domains/orders/index.ts`
Eksport nowej query i akcji.

### `src/app/[locale]/(main)/layout.tsx`
Dodanie wywołania `hasUnseenOrderChanges` obok istniejącego `hasUnreadMessages`, przekazanie do `NavBar` jako `hasUnseenOrders`.

### `src/shared/ui/nav-bar.tsx`
Dodanie `hasUnseenOrders?: boolean` do interfejsu `NavBarProps`. Renderowanie kropki na ikonie `Package` (zamówienia) analogicznie do istniejącej kropki na `MessageCircle`.

### `src/app/[locale]/(main)/orders/[id]/page.tsx`
Wywołanie `markOrderSeen(orderId, session.user.id)` na początku renderowania.

### `src/app/[locale]/(main)/farmer/orders/[id]/page.tsx`
Wywołanie `markOrderSeen(orderId, session.user.id)` na początku renderowania.

## Migracja

Jedna migracja Drizzle: `drizzle/XXXX_order_seen_flags.sql`
```sql
ALTER TABLE orders ADD COLUMN customer_has_seen boolean NOT NULL DEFAULT true;
ALTER TABLE orders ADD COLUMN farmer_has_seen boolean NOT NULL DEFAULT true;
```

## Co poza zakresem

- Liczniki (ile nieodczytanych) — tylko dot badge
- Push notifications
- Real-time aktualizacje badge'a (odświeżanie przy każdej nawigacji przez Next.js layout)
