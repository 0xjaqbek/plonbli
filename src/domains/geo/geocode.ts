/**
 * Geocoding via Nominatim (OpenStreetMap) — free, no API key.
 * Rate limit: max 1 req/s. Server-side only.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "plonbli/1.0 (https://plonbli.vercel.app)";

interface NominatimResult {
  lat: string;
  lon: string;
}

/**
 * Geocode a location name to lat/lng coordinates.
 * Tries commune → county → voivodeship in cascade.
 * Returns null if nothing found.
 */
export async function geocodeLocation(params: {
  commune?: string | null;
  county?: string | null;
  voivodeship?: string | null;
}): Promise<{ latitude: string; longitude: string } | null> {
  const queries: string[] = [];

  if (params.commune && params.voivodeship) {
    queries.push(`${params.commune}, ${params.voivodeship}, Polska`);
  }
  if (params.county && params.voivodeship) {
    queries.push(`powiat ${params.county}, ${params.voivodeship}, Polska`);
  }
  if (params.voivodeship) {
    queries.push(`województwo ${params.voivodeship}, Polska`);
  }

  for (const q of queries) {
    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set("q", q);
      url.searchParams.set("format", "json");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "pl");

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": USER_AGENT },
      });

      if (!res.ok) continue;

      const data: NominatimResult[] = await res.json();
      if (data.length > 0) {
        return {
          latitude: data[0].lat,
          longitude: data[0].lon,
        };
      }
    } catch {
      // Nominatim error — try next query
      continue;
    }

    // Rate limit: wait 1s between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  return null;
}
