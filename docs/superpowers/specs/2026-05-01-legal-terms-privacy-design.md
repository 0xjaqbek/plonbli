# Legal — Regulamin, Polityka Prywatności, Prawa użytkownika

**Data:** 2026-05-01
**Status:** Zatwierdzony

## Przegląd

Dodanie dostępu do dokumentów prawnych (regulamin, polityka prywatności) w dwóch miejscach: stopka okna auth oraz dedykowana sekcja w profilu. Sekcja profilu obejmuje też pełną implementację praw RODO: eksport danych i usunięcie konta (anonimizacja).

Strony z treścią regulaminu i polityki prywatności już istnieją (`/(legal)/terms`, `/(legal)/privacy`).

---

## Sekcja 1: Auth — stopka + checkbox rejestracji

### Auth layout footer

**Plik:** `src/app/[locale]/(auth)/layout.tsx`

Dodanie stopki poniżej `<Card>`, widocznej zarówno na `/login` jak i `/register`:

```
[karta]

Regulamin · Polityka prywatności
```

- Tekst `text-xs text-muted-foreground`, linki prowadzą do `/{locale}/terms` i `/{locale}/privacy`
- Jeden komponent w layout — brak duplikacji między formularzami

### RegisterForm — checkbox akceptacji

**Plik:** `src/domains/auth/components/register-form.tsx`
**Schemat:** `src/domains/auth/schemas/validation.ts`

Nowe pole `acceptTerms: z.literal(true, { errorMap: () => ({ message: "..." }) })` w `registerSchema`. Checkbox renderowany przez `FormField` / shadcn `Checkbox`. Tekst z linkami do regulaminu i polityki.

Bez zaznaczenia → formularz nie przechodzi walidacji po stronie klienta.

`acceptTerms` **nie jest przekazywane** do server action — istnieje tylko w warstwie klienta. Fakt rejestracji = wyrażenie zgody.

---

## Sekcja 2: Profil — karta "Prawa i dokumenty"

**Plik:** `src/app/[locale]/(main)/profile/page.tsx`

Nowa `<Card>` dodana jako czwarta karta na stronie, po istniejącej karcie z quicklinks (ta zawiera ustawienia, wylogowanie). Trzy sekcje:

### Dokumenty
- Link "Regulamin" → `/{locale}/terms`
- Link "Polityka prywatności" → `/{locale}/privacy`

Styl: wiersze identyczne jak istniejąca nawigacja (`ChevronRight`, `hover:bg-accent`).

### Twoje dane
- Link/przycisk "Pobierz swoje dane" → wywołuje `GET /api/user/export`
- Przeglądarka pobiera plik `plonbli-dane.json`

### Strefa niebezpieczna
- Przycisk "Usuń konto" → otwiera shadcn `AlertDialog`
- Dialog zawiera:
  - Opis konsekwencji (dane osobowe zostaną usunięte, treści pozostaną jako "Użytkownik usunięty")
  - Pole tekstowe: "wpisz swój adres email, aby potwierdzić"
  - Przycisk potwierdzenia (aktywny tylko gdy email się zgadza)
- Po potwierdzeniu → Server Action → przekierowanie do `/login`

---

## Sekcja 3: Backend

### Anonimizacja konta

**Plik:** `src/domains/auth/actions/delete-account.ts`

Server Action chroniona przez `auth()`. Walidacja: email z formularza musi zgadzać się z emailem zalogowanego użytkownika.

Jeśli walidacja przechodzi — jedna transakcja Drizzle:

```
users SET:
  name        = "Użytkownik usunięty"
  email       = sha256(original_email)   ← nieodwracalne, zachowuje unikalność (Node.js crypto module)
  avatar      = NULL
  passwordHash = NULL
  googleId    = NULL
  facebookId  = NULL
```

Po anonimizacji: `signOut({ redirectTo: "/login" })`.

**Nie wymaga zmian w schemacie bazy.** Posty, recenzje, ogłoszenia, zamówienia pozostają w bazie — powiązane przez `userId`, ale bez PII użytkownika.

### Eksport danych

**Plik:** `src/app/api/user/export/route.ts`

`GET` handler chroniony przez `auth()`. Zbiera w jednym wywołaniu:

- Profil użytkownika (bez `passwordHash`, `googleId`, `facebookId`)
- Ogłoszenia (listings)
- Posty społecznościowe
- Wystawione recenzje
- Otrzymane recenzje
- Zamówienia

Odpowiedź:

```http
Content-Type: application/json
Content-Disposition: attachment; filename="plonbli-dane.json"
```

Bez paginacji — jednorazowe zapytanie dla pojedynczego użytkownika.

---

## i18n

Nowe klucze w `messages/pl.json`:

**namespace `auth`:**
```json
"acceptTerms": "Akceptuję <terms>Regulamin</terms> i <privacy>Politykę Prywatności</privacy>",
"acceptTermsError": "Musisz zaakceptować regulamin i politykę prywatności",
"termsLink": "Regulamin",
"privacyLink": "Polityka prywatności",
"legalFooter": "Regulamin · Polityka prywatności"
```

Uwaga: `acceptTerms` używa next-intl rich text (tagi `<terms>` / `<privacy>` zamieniane na `<Link>`).
Auth layout (`(auth)/layout.tsx`) jest Server Component — dodajemy `getTranslations("auth")` i używamy kluczy `termsLink` / `privacyLink` dla stopki.

**namespace `profile`:**
```json
"legalSection": "Prawa i dokumenty",
"documents": "Dokumenty",
"yourData": "Twoje dane",
"downloadData": "Pobierz swoje dane",
"dangerZone": "Strefa niebezpieczna",
"deleteAccount": "Usuń konto",
"deleteAccountDialog": {
  "title": "Usuń konto",
  "description": "Ta operacja jest nieodwracalna. Twoje dane osobowe zostaną usunięte. Treści, które opublikowałeś, pozostaną na platformie jako \"Użytkownik usunięty\".",
  "confirmLabel": "Wpisz swój adres email, aby potwierdzić",
  "confirmButton": "Usuń konto na zawsze",
  "cancel": "Anuluj"
}
```

---

## Pliki do zmiany / utworzenia

| Plik | Akcja |
|------|-------|
| `src/app/[locale]/(auth)/layout.tsx` | Edycja — dodanie stopki z linkami |
| `src/domains/auth/schemas/validation.ts` | Edycja — dodanie `acceptTerms` do `registerSchema` |
| `src/domains/auth/components/register-form.tsx` | Edycja — dodanie pola checkbox |
| `src/app/[locale]/(main)/profile/page.tsx` | Edycja — dodanie karty "Prawa i dokumenty" |
| `src/domains/auth/actions/delete-account.ts` | Nowy — Server Action anonimizacji |
| `src/app/api/user/export/route.ts` | Nowy — API route eksportu danych |
| `messages/pl.json` | Edycja — nowe klucze i18n |
