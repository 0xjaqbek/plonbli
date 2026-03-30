# Mapa rolników — design spec

## Cel

Dodać interaktywną mapę na stronie `/farmers` z markerami lokalizacji rolników. Pomaga konsumentom znaleźć najbliższych rolników.

## Architektura

### UI — zakładki Lista/Mapa

Komponent `FarmersTabs` na stronie `/farmers` — przełącznik widoków (wzorowany na `EventsTabs`).

- **Lista** — istniejący grid kart rolników
- **Mapa** — nowy komponent `FarmerMap` (Leaflet + OpenStreetMap, darmowe, już w projekcie)

### Komponent `FarmerMap`

- Leaflet `MapContainer`, dynamic import (`ssr: false`)
- OpenStreetMap tiles (jak w `EventMap`)
- Markery rolników z popup: nazwa, lokalizacja, link do profilu
- Dwa style markerów:
  - **Zielony** — dokładna pozycja (lat/lng z profilu)
  - **Szary/półprzezroczysty** — pozycja przybliżona (geocoding z nazwy gminy/powiatu/województwa)

### Geolokalizacja użytkownika

- Przy montowaniu: `navigator.geolocation.getCurrentPosition()`
- Sukces: centruj na użytkowniku, zoom ~10
- Odmowa/błąd: fallback — widok całej Polski (51.92, 19.15, zoom 6)
- Marker użytkownika: niebieski, wyróżniony

### Rozwiązywanie lokalizacji rolników

Kaskada dokładności — użyj najdokładniejszego:

1. `latitude` + `longitude` na userze — pozycja dokładna (marker zielony)
2. `commune` — geocoding Nominatim → centrum gminy (marker szary)
3. `county` — geocoding Nominatim → centrum powiatu (marker szary)
4. `voivodeship` — statyczny słownik `VOIVODESHIP_CENTERS` (marker szary)
5. Brak danych lokalizacyjnych — pominięty na mapie

### Geocoding — Nominatim (OpenStreetMap)

- Darmowe API: `https://nominatim.openstreetmap.org/search`
- Query: `{commune/county}, {voivodeship}, Polska` → lat/lng
- **Cache:** wynik geocodingu zapisywany w `latitude`/`longitude` na userze (one-time resolution)
- **Rate limit:** Nominatim wymaga max 1 req/s — geocoding uruchamiany server-side, sekwencyjnie, z pauzą
- **Fallback:** jeśli Nominatim nie zwróci wyniku → spadnij do niższego poziomu kaskady
- **User-Agent:** wymagany przez Nominatim — ustawiamy `plonbli/1.0`

### Statyczny słownik `VOIVODESHIP_CENTERS`

16 wpisów z centrum geograficznym każdego województwa. Fallback gdy Nominatim zawiedzie i brak powiatu/gminy.

### Query: `getFarmersForMap`

```typescript
// Zwraca rolników z danymi lokalizacyjnymi
type FarmerMapEntry = {
  id: string;
  name: string;
  avatar: string | null;
  latitude: string | null;
  longitude: string | null;
  voivodeship: string | null;
  county: string | null;
  commune: string | null;
  isApproximate: boolean; // true gdy pozycja z geocodingu
};
```

### Geocoding flow (server-side)

1. Query pobiera rolników bez lat/lng ale z commune/county/voivodeship
2. Dla każdego: Nominatim lookup (commune > county > voivodeship fallback)
3. Wynik zapisywany do `users.latitude`/`users.longitude`
4. Następnym razem — używa zapisanych współrzędnych (cache)
5. Geocoding uruchamiany lazy — przy pierwszym renderze strony mapy

### Dane demo

Zaktualizować seed script — dodać `latitude`/`longitude` do 4 demo rolników.

## Poza scope

- Filtrowanie po odległości (wymaga PostGIS)
- Wyszukiwarka/filtr na mapie
- Klasteryzacja markerów (MarkerCluster — dodamy gdy będzie dużo rolników)
- Interakcja mapa↔lista (scrollowanie do karty po kliknięciu markera)

## Stack

- `leaflet` + `react-leaflet` (v5) — już zainstalowane
- OpenStreetMap tiles — darmowe
- Nominatim API — darmowy geocoding
- Brak nowych zależności
