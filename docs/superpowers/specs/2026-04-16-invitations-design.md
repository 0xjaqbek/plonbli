# Invitations — Design Spec

**Date:** 2026-04-16
**Status:** Approved

## Overview

System zaproszeń umożliwiający użytkownikom generowanie plakatu PDF z kodem QR, który kieruje nowych użytkowników do rejestracji. Śledzi kto wygenerował zaproszenie i kto z niego skorzystał.

---

## 1. Model danych

### Nowa tabela: `invitations`

| Kolumna     | Typ          | Opis                                      |
|-------------|--------------|-------------------------------------------|
| `id`        | cuid2 PK     |                                           |
| `userId`    | FK → users   | UNIQUE — jeden kod per użytkownik         |
| `code`      | varchar(32)  | UNIQUE — losowy ciąg (nanoid)             |
| `createdAt` | timestamp    |                                           |

### Modyfikacja tabeli: `users`

| Kolumna       | Typ        | Opis                                          |
|---------------|------------|-----------------------------------------------|
| `invitedById` | FK → users | NULL — kto zaprosił tego użytkownika (1x set) |

Relacja 1:1 (użytkownik może być zaproszony tylko raz) — kolumna na tabeli `users` zamiast junction table upraszcza zapytania.

---

## 2. Struktura domeny

```
src/domains/invitations/
  actions/
    get-or-create-invitation.ts   — tworzy kod leniwie przy pierwszej wizycie /profile/invite
  queries/
    get-invited-users.ts          — lista osób zaproszonych przez mnie (imię + data)
    get-invitation-by-code.ts     — walidacja kodu przy rejestracji
  lib/
    poster.tsx                    — komponent react-pdf (plakat A4)
  index.ts
```

---

## 3. Routing

### Nowe trasy

| Trasa                         | Opis                                                       |
|-------------------------------|------------------------------------------------------------|
| `/profile/invite`             | Strona statystyk: kto mnie zaprosił + lista zaproszonych   |
| `GET /api/invite/poster`      | Route Handler — zwraca PDF, wymaga auth                    |

### Modyfikowane pliki

- `src/app/[locale]/(main)/profile/page.tsx` — przycisk "Zaproś" nad "Ustawienia"
- `src/app/[locale]/(auth)/register/page.tsx` — odczyt `?invite=CODE`, ukryte pole formularza
- `src/domains/auth/actions/register.ts` — ustawienie `invitedById` po rejestracji
- `src/shared/db/schema/users.ts` — kolumna `invitedById`
- `src/shared/db/schema/index.ts` — eksport tabeli `invitations`

---

## 4. Przepływy użytkownika

### Generowanie plakatu

1. Użytkownik wchodzi na `/profile/invite`
2. Akcja `getOrCreateInvitation` tworzy rekord w `invitations` (jeśli nie istnieje) i zwraca kod
3. Strona wyświetla: sekcję "kto mnie zaprosił" (jeśli dotyczy) + listę zaproszonych + przycisk "Wygeneruj zaproszenie"
4. Kliknięcie przycisku → `GET /api/invite/poster`
5. Route Handler pobiera kod i `user.name` z sesji, generuje QR (lib `qrcode`) wskazujący na `/register?invite=CODE`, renderuje plakat `@react-pdf/renderer`, zwraca PDF z nagłówkiem `Content-Disposition: attachment; filename="zaproszenie.pdf"`

### Rejestracja przez zaproszenie

1. Nowy użytkownik skanuje QR → `/register?invite=CODE`
2. Strona rejestracji odczytuje `invite` z searchParams → wstrzykuje jako ukryte pole formularza
3. Akcja `register` sprawdza kod w `invitations`, ustawia `invitedById` na nowym użytkowniku
4. Nieprawidłowy lub nieistniejący kod jest cicho ignorowany — rejestracja przebiega normalnie

### Podgląd na profilu osoby zaproszonej

- Na stronie `/profile/invite` wyświetlana sekcja "Zaproszony przez [imię]" jeśli `session.user.invitedById` jest ustawione

---

## 5. Zawartość plakatu PDF (A4, pionowy)

| Pozycja       | Treść                                                     |
|---------------|-----------------------------------------------------------|
| Góra          | Logo aplikacji + nazwa "Plonbli"                          |
| Slogan        | "Kupuj lokalnie. Wspieraj rolników."                      |
| Opis          | 2–3 zdania o aplikacji (stała treść w komponencie)        |
| Środek        | Duży kod QR                                               |
| Pod QR        | "Zeskanuj, żeby dołączyć"                                 |
| Dół           | `Zaproszenie od: [imię użytkownika]` + URL z kodem        |

Treść tekstowa jest stała — nie jest przechowywana w bazie. Personalizowany jest tylko QR i imię użytkownika.

**Biblioteki:**
- `@react-pdf/renderer` — generowanie PDF server-side
- `qrcode` — generowanie QR jako data URL

---

## 6. Testowanie

| Co testować                               | Typ testu   |
|-------------------------------------------|-------------|
| `getOrCreateInvitation` — leniwe tworzenie | Jednostkowy |
| `getInvitedUsers` — poprawna lista         | Jednostkowy |
| `register` — ustawienie `invitedById`      | Jednostkowy |
| `register` — ignorowanie nieważnego kodu  | Jednostkowy |
| Route Handler PDF                          | Brak (UI)   |

---

## 7. Decyzje i ograniczenia

- Jeden kod QR na użytkownika, ważny bezterminowo
- Kod tworzony leniwie przy pierwszej wizycie na `/profile/invite`
- Użytkownik może być zaproszony tylko przez jedną osobę (`invitedById` set raz, nie zmieniane)
- Szablon plakatu stały — tylko QR i imię zapraszającego są dynamiczne
- Nieprawidłowy kod zaproszenia nie blokuje rejestracji
- `invitedById` odczytywane przez zapytanie do bazy przy ładowaniu `/profile/invite` — nie jest częścią JWT sesji
