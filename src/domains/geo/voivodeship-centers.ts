import type { Voivodeship } from "./types";

/**
 * Approximate geographic centers of Polish voivodeships.
 * Used as fallback when more precise location is unavailable.
 */
export const VOIVODESHIP_CENTERS: Record<Voivodeship, [number, number]> = {
  "dolnoslaskie": [51.1, 16.88],
  "kujawsko-pomorskie": [53.12, 18.0],
  "lubelskie": [51.25, 22.57],
  "lubuskie": [52.13, 15.5],
  "lodzkie": [51.75, 19.47],
  "malopolskie": [49.88, 20.25],
  "mazowieckie": [52.23, 20.97],
  "opolskie": [50.67, 17.93],
  "podkarpackie": [49.85, 22.0],
  "podlaskie": [53.43, 22.97],
  "pomorskie": [54.2, 18.0],
  "slaskie": [50.33, 19.17],
  "swietokrzyskie": [50.87, 20.65],
  "warminsko-mazurskie": [53.87, 20.47],
  "wielkopolskie": [52.17, 17.33],
  "zachodniopomorskie": [53.75, 15.4],
};
