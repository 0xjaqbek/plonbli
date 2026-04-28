# DAC7 — Model Tablicy Ogłoszeń (Noticeboard Model)

**Data:** 2026-04-28
**Status:** Zatwierdzona

## Kontekst i cel

Dyrektywa DAC7 (2021/514/UE) nakłada na operatorów platform cyfrowych obowiązek zbierania, weryfikacji i raportowania danych o sprzedawcach do organów podatkowych (KAS w Polsce). Dotyczy platform, które **łączą sprzedawców z kupującymi i są świadome wynagrodzenia** wypłacanego sprzedawcom.

Plonbli nie jest platformą ecommerce — transakcje odbywają się poza platformą. Jednak obecna implementacja modułu `orders` śledzi `total_amount`, `shipping_cost`, dowody płatności i metody płatności rolnika, co czyni platformę "świadomą wynagrodzenia" w rozumieniu DAC7.

**Cel:** Usunąć wszystkie dane finansowe z modułu zapytań (orders), zachowując jego wartość UX jako narzędzia logistycznego. Platforma staje się czystą tablicą ogłoszeń — rolnik podaje cenę orientacyjną na listingu, konsument składa zapytanie o produkty i ilości, a finalna kwota i płatność są ustalane bezpośrednio między stronami.

## Co NIE zmienia się

- **`listings.price`** — cena na ogłoszeniu zostaje (etykieta cenowa, jak na OLX)
- **`listings.deliveryOptions`** z polami `cost`/`minAmount` — informacja o warunkach, nie zapis transakcji
- **Statusy zapytania:** PENDING → CONFIRMED → PREPARING → READY_FOR_PICKUP → COMPLETED/CANCELLED
- **`order_items.quantity`** i `modified_quantity` — ilości (logistyczne, nie finansowe)
- **Pickup slots** — harmonogram odbioru rolnika (czysto logistyczny)
- **Moduł messaging** z kontekstem order — zostaje bez zmian

## Zmiany w schemacie bazy danych

### Tabele do usunięcia (DROP)

| Tabela | Powód |
|---|---|
| `payment_proofs` | Weryfikacja płatności przez platformę → świadomość transakcji |
| `farmer_payment_methods` | Dane finansowe rolnika zbędne bez śledzenia płatności |

### Kolumny do usunięcia z tabeli `orders`

| Kolumna | Powód |
|---|---|
| `total_amount` | Zapis sumy transakcji → świadomość wynagrodzenia |
| `shipping_cost` | Zapis kosztu dostawy → element transakcji |
| `payment_required` | Tryb płatności (PREPAID/ON_PICKUP) → zbędny |
| `payment_method` | Metoda płatności → zbędna |

### Kolumny do usunięcia z tabeli `order_items`

| Kolumna | Powód |
|---|---|
| `price_per_unit` | Snapshot finansowy ceny w momencie zamówienia |
| `modified_price_per_unit` | Korekta ceny przez rolnika — negocjacja finansowa |

### Orientacyjna wartość (computed, never stored)

Wartość orientacyjna = `sum(listing.price × item.quantity)` dla wszystkich pozycji zapytania.
Obliczana na żywo przy renderowaniu, **nigdy nie zapisywana do bazy**.
Wyświetlana z obowiązkową etykietą: *"Orientacyjna wartość — do ustalenia bezpośrednio z rolnikiem"*.

## Zmiany w kodzie

### Pliki do usunięcia

**Actions:**
- `src/domains/orders/actions/submit-payment-proof.ts`
- `src/domains/orders/actions/verify-payment.ts`
- `src/domains/orders/actions/manage-payment-methods.ts`

**Components:**
- `src/domains/orders/components/payment-proof-form.tsx`
- `src/domains/orders/components/farmer-dashboard/payment-methods-form.tsx`

**Queries:**
- `src/domains/orders/queries/get-farmer-payment-methods.ts`

### Actions do aktualizacji

| Plik | Zmiana |
|---|---|
| `create-order.ts` | Usunąć pola finansowe ze schematu Zod i DB insert |
| `modify-order.ts` | Zostawić tylko modyfikację ilości (`quantity`), usunąć `pricePerUnit` |
| `accept-modification.ts` | Usunąć logikę akceptacji zmiany ceny |

### Components do aktualizacji

| Plik | Zmiana |
|---|---|
| `checkout-form.tsx` | Usunąć wybór metody płatności; dodać komunikat o ustaleniu szczegółów z rolnikiem |
| `order-detail.tsx` | Usunąć sekcję płatności; dodać orientacyjną wartość (computed) |
| `farmer-order-detail.tsx` | Usunąć weryfikację płatności; dodać orientacyjną wartość |
| `order-items-table.tsx` | Zastąpić zapisaną cenę obliczaną orientacyjną wartością |
| `cart-view.tsx` | Usunąć sumę koszyka; pokazać orientacyjną wartość z etykietą |

### Validation schemas

`src/domains/orders/validation.ts` — usunąć pola:
- `paymentMethod`, `paymentRequired` z `createOrderSchema`
- `pricePerUnit`, `modifiedPricePerUnit` z `addToCartSchema` / `modifyOrderSchema`
- Usunąć całe schematy: `submitPaymentProofSchema`, `paymentMethodSchema`

### Routes do usunięcia

Sprawdzić `src/app/` pod kątem stron dedykowanych:
- Payment proof submission
- Payment methods management (ustawienia rolnika)

## Zmiany w i18n (pl.json)

### Nowe klucze

```json
"orders": {
  "indicativeValue": "Orientacyjna wartość",
  "indicativeValueNote": "Kwota do ustalenia bezpośrednio z rolnikiem",
  "indicativeDeliveryCost": "Orientacyjny koszt dostawy",
  "inquiryNote": "Szczegóły płatności i dostawy ustalisz bezpośrednio z rolnikiem po złożeniu zapytania."
}
```

### Klucze do usunięcia

Wszystkie klucze z prefiksem:
- `orders.paymentMethod`, `orders.paymentProof`, `orders.paymentRequired`
- `orders.prepaid`, `orders.onPickup`
- `orders.submitProof`, `orders.verifyPayment`
- `orders.paymentMethods.*`

## Konsekwencje DAC7

Po wdrożeniu tych zmian plonbli staje się platformą w modelu "tablicy ogłoszeń":
- Platforma **nie zna** faktycznie zapłaconej kwoty
- Platforma **nie weryfikuje** płatności
- Platforma **nie przechowuje** metod płatności sprzedawców
- Ceny listingów = etykiety informacyjne, nie dane transakcyjne
- Orientacyjna wartość = obliczenie pomocnicze dla UX, nie zapis transakcji

Model analogiczny do OLX/Allegro Lokalnie w kategorii ogłoszeń bez płatności platformy — DAC7 raportowanie nie stosuje się.

## Co NIE wchodzi w zakres tej zmiany

- Zbieranie NIP/PESEL rolników (nie wymagane w modelu tablicy ogłoszeń)
- Zmiany w module `reputation` (recenzje)
- Zmiany w module `farming` (dzienniki upraw)
- Zmiany w module `logistics` (collectiony, pickup points)
- Usuwanie nomenklatury "zapytania" — już zmienione w poprzednim commicie
