# Order Flow Design

System zamowien dla platformy Plonbli — od koszyka po potwierdzenie odbioru.

## Zasady ogolne

- Jedno zamowienie = jeden rolnik
- Koszyk per rolnik (klient moze miec wiele koszykow, kazdy dla innego rolnika)
- Platnosci poza platforma (BLIK, przelew, krypto, gotowka przy odbiorze)
- Platforma przechowuje dowody platnosci i umozliwia weryfikacje
- Rolnik recznie potwierdza otrzymanie platnosci
- Rezerwacja ilosci dopiero po potwierdzeniu zamowienia przez rolnika

## Flow statusow

```
PENDING (zlożone)
  → klient sklada zamowienie z koszyka
  → rolnik dostaje powiadomienie

MODIFIED (zmodyfikowane) [opcjonalny]
  → rolnik przegląda zamowienie
  → moze zmienic ilosci/ceny/koszt wysylki
  → ustala: metode platnosci, termin odbioru/wysylki
  → klient widzi zmiany i musi zaakceptowac lub anulowac

CONFIRMED (potwierdzone)
  → klient akceptuje warunki (lub od razu jesli rolnik nic nie zmienil)
  → klient widzi dane do platnosci

PAID (oplacone)
  → klient przesyla dowod platnosci
  → rolnik zatwierdza otrzymanie
  → POMIJANE przy platnosci przy odbiorze

PREPARING (w przygotowaniu) [tylko wysylka]
  → rolnik pakuje zamowienie

SHIPPED (wyslane) [tylko wysylka]
  → rolnik podaje numer przesylki + opcjonalny link tracking

READY_FOR_PICKUP (gotowe do odbioru) [tylko odbior osobisty]
  → rolnik sygnalizuje gotowosc

COMPLETED (odebrane)
  → klient potwierdza odbior
  → odblokowane wystawianie opinii

CANCELLED (anulowane)
  → z dowolnego etapu przed COMPLETED
  → klient: swobodnie przed CONFIRMED, po — wymaga zgody rolnika
  → rolnik: zawsze z podaniem powodu
```

### Przejscia statusow

```
pending → modified       (rolnik modyfikuje)
pending → confirmed      (rolnik potwierdza bez zmian)
pending → cancelled      (klient lub rolnik anuluje)

modified → confirmed     (klient akceptuje zmiany)
modified → cancelled     (klient odrzuca zmiany lub rolnik anuluje)

confirmed → paid         (klient przesyla dowod, rolnik potwierdza)
confirmed → preparing    (platnosc przy odbiorze, tylko wysylka)
confirmed → ready_for_pickup (platnosc przy odbiorze, odbior osobisty)
confirmed → cancelled    (za zgoda obu stron)

paid → preparing         (wysylka)
paid → ready_for_pickup  (odbior osobisty)
paid → cancelled         (za zgoda obu stron, rolnik zwraca pieniadze)

preparing → shipped      (rolnik wysyla paczke)
preparing → cancelled    (za zgoda obu stron)

shipped → completed      (klient potwierdza odbior)

ready_for_pickup → completed (klient potwierdza odbior)
```

## Model danych

### Tabela `orders`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | PK |
| orderNumber | varchar | Czytelny numer (PLB-2026-00001) |
| customerId | UUID → users.id | Klient |
| farmerId | UUID → users.id | Rolnik |
| status | enum | pending, modified, confirmed, paid, preparing, shipped, ready_for_pickup, completed, cancelled |
| deliveryMethod | enum | pickup, delivery, drop_point |
| deliveryAddress | text (nullable) | Adres wysylki |
| pickupSlotId | UUID → pickup_slots.id (nullable) | Wybrany slot odbioru |
| shippingCost | decimal (nullable) | Koszt wysylki (domyslnie z listingu, rolnik moze skorygowac) |
| trackingNumber | varchar (nullable) | Numer przesylki |
| trackingUrl | varchar (nullable) | Link do sledzenia |
| paymentMethod | enum (nullable) | blik, transfer, crypto, cash_on_pickup |
| paymentRequired | enum | prepaid, on_pickup |
| totalAmount | decimal | Suma pozycji + shipping |
| customerNote | text (nullable) | Notatka klienta |
| farmerNote | text (nullable) | Notatka rolnika |
| cancellationReason | text (nullable) | Powod anulowania |
| cancelledBy | enum (nullable) | customer, farmer |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Tabela `order_items`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | PK |
| orderId | UUID → orders.id | |
| listingId | UUID → listings.id | |
| productName | varchar | Snapshot nazwy produktu |
| quantity | decimal | Zamowiona ilosc |
| unit | enum | kg, piece, liter, bunch |
| pricePerUnit | decimal | Snapshot ceny |
| totalPrice | decimal | quantity * pricePerUnit |
| modifiedQuantity | decimal (nullable) | Ilosc po modyfikacji rolnika |
| modifiedPricePerUnit | decimal (nullable) | Cena po modyfikacji rolnika |

Obliczanie kwot: jesli `modifiedQuantity`/`modifiedPricePerUnit` istnieja, uzywane sa zamiast oryginalnych wartosci. `totalPrice` pozycji i `totalAmount` zamowienia przeliczane przy modyfikacji.

### Tabela `order_status_history`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | PK |
| orderId | UUID → orders.id | |
| status | enum | Status na ktory zmieniono |
| note | text (nullable) | Opcjonalna notatka |
| createdBy | UUID → users.id | Kto zmienil |
| createdAt | timestamp | |

### Tabela `payment_proofs`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | PK |
| orderId | UUID → orders.id | |
| type | enum | screenshot, bank_transfer, blockchain_link |
| imageUrl | varchar (nullable) | URL screenshota (Cloudflare R2) |
| transactionUrl | varchar (nullable) | Link do blockexplorera |
| description | text (nullable) | Opis |
| verified | boolean | Rolnik zatwierdzil? Default false |
| createdAt | timestamp | |

### Tabela `farmer_payment_methods`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | PK |
| farmerId | UUID → users.id | |
| type | enum | blik, transfer, crypto |
| label | varchar | Np. "BLIK na telefon", "BTC" |
| details | text | Numer telefonu, konto, adres krypto |
| isDefault | boolean | |
| isActive | boolean | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Tabela `pickup_slots`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | PK |
| farmerId | UUID → users.id | |
| orderId | UUID → orders.id (nullable) | Null = globalny slot, nie-null = per zamowienie |
| dayOfWeek | int (nullable) | 0-6, dla globalnych slotow |
| specificDate | date (nullable) | Dla slotow per zamowienie |
| startTime | time | Poczatek okna |
| endTime | time | Koniec okna |
| isActive | boolean | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

### Tabela `cart_items`

| Kolumna | Typ | Opis |
|---------|-----|------|
| id | UUID | PK |
| userId | UUID → users.id | |
| listingId | UUID → listings.id | |
| quantity | decimal | |
| createdAt | timestamp | |
| updatedAt | timestamp | |

Koszyk per rolnik wynika z relacji: cart_items → listings → products → farmerId. Nie trzeba osobnej tabeli koszyka.

## Reguly biznesowe

### Koszyk
- Klient ma osobny koszyk per rolnik (wynika z relacji listing → farmer)
- Koszyk przechowywany w bazie (zalogowany uzytkownik)
- Walidacja dostepnosci przy skladaniu zamowienia (nie rezerwuje ilosci)

### Skladanie zamowienia
- Klient wybiera metode dostawy (pickup/delivery/drop_point) — zgodnie z opcjami w listingu
- Przy pickup — wybiera slot z dostepnych (globalne lub per zamowienie)
- Przy delivery — podaje adres dostawy
- Moze dodac notatke dla rolnika

### Modyfikacja przez rolnika
- Rolnik moze zmienic: ilosci, ceny, koszt wysylki
- Rolnik ustala: metode platnosci (przedplata/przy odbiorze), sloty odbioru (jesli chce nadpisac domyslne)
- Modyfikacja zmienia status na `modified`
- Klient dostaje powiadomienie, musi zaakceptowac lub anulowac
- Jesli rolnik nic nie zmienia — potwierdza od razu, status przechodzi na `confirmed`

### Rezerwacja ilosci
- Dopiero po statusie `confirmed` — `quantityAvailable` w listingu spada
- Przy anulowaniu po `confirmed` — ilosc wraca

### Anulowanie
- Klient: swobodnie gdy status `pending` lub `modified`
- Klient po `confirmed`: wysyla prosbe o anulowanie, rolnik musi zatwierdzic
- Rolnik: moze anulowac w kazdym momencie z obowiazkowym podaniem powodu
- Anulowanie po `paid`: rolnik powinien zwrocic pieniadze (platforma nie wymusza, ale wyswietla przypomnienie)

### Platnosc
- Po `confirmed` klient widzi metody platnosci rolnika
- Klient przesyla dowod platnosci (screenshot/link do transakcji)
- Rolnik recznie potwierdza otrzymanie → status `paid`
- Przy `on_pickup`: status pomija `paid`, przechodzi od razu do `preparing`/`ready_for_pickup`

### Tracking
- Przy wysylce: rolnik podaje numer przesylki (wymagany) i link do sledzenia (opcjonalny)
- Status zmienia sie na `shipped`

### Zakonczenie
- Klient potwierdza odbior → status `completed`
- Po `completed` odblokowane wystawianie opinii (powiazanie z review system)

## Widoki UI

### Klient

- **Koszyk** (`/marketplace/cart`) — lista koszykow per rolnik, kazdy z pozycjami, podsumowaniem i przyciskiem "Zloz zamowienie"
- **Skladanie zamowienia** (`/marketplace/cart/[farmerId]/checkout`) — wybor dostawy, slot odbioru, adres, notatka, podsumowanie
- **Moje zamowienia** (`/orders`) — lista zamowien z filtrowaniem po statusie
- **Szczegoly zamowienia** (`/orders/[id]`) — status timeline, pozycje (oryginalne vs zmodyfikowane), dane platnosci, przyciski akcji: "Przeslij dowod platnosci", "Potwierdz odbior", "Anuluj", "Napisz do rolnika"
- **Akceptacja modyfikacji** — w szczegolach zamowienia: porownanie oryginalnych vs zmodyfikowanych wartosci, przyciski "Akceptuje" / "Anuluje"

### Rolnik

- **Dashboard zamowien** (`/farmer/orders`) — lista zamowien z filtrowaniem po statusie, wyrosnione nowe zamowienia
- **Szczegoly zamowienia** (`/farmer/orders/[id]`) — pozycje, dane klienta, przyciski akcji zalezne od statusu: "Potwierdz"/"Modyfikuj", "Potwierdz platnosc", "Oznacz jako wyslane" (+ tracking), "Gotowe do odbioru"
- **Metody platnosci** (`/farmer/settings/payments`) — zarzadzanie BLIK/przelew/krypto
- **Harmonogram odbioru** (`/farmer/settings/pickup-schedule`) — globalne sloty tygodniowe

### Wspolne

- Powiadomienia przy zmianie statusu (in-app, docelowo push)
- Badge z liczba aktywnych zamowien w nawigacji

## Domena `src/domains/orders/`

Nowa domena w strukturze domain-driven. Samodzielna z wlasnymi actions, queries, components, schemas. Importuje z `marketplace` (listings, products) i opcjonalnie z `messaging`.

```
src/domains/orders/
  actions/
    create-order.ts
    modify-order.ts         (rolnik modyfikuje)
    accept-modification.ts  (klient akceptuje)
    confirm-order.ts        (rolnik potwierdza bez zmian)
    submit-payment-proof.ts
    verify-payment.ts       (rolnik potwierdza platnosc)
    update-order-status.ts  (preparing, shipped, ready_for_pickup)
    complete-order.ts       (klient potwierdza odbior)
    cancel-order.ts
    add-to-cart.ts
    remove-from-cart.ts
    update-cart-item.ts
  queries/
    get-order.ts
    get-customer-orders.ts
    get-farmer-orders.ts
    get-cart.ts
    get-pickup-slots.ts
    get-farmer-payment-methods.ts
  components/
    cart/
    order-detail/
    order-list/
    checkout/
    payment-proof/
    pickup-slots/
    farmer-dashboard/
  schemas/
    order.schema.ts
    cart.schema.ts
    payment.schema.ts
    pickup-slot.schema.ts
  types/
    index.ts
  index.ts                  (barrel export — public API)
```

Metody platnosci rolnika i harmonogram odbioru to czesci domeny orders, bo sa scisle powiazane z procesem zamowienia.
