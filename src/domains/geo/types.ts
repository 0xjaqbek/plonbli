export const VOIVODESHIPS = [
  "dolnoslaskie",
  "kujawsko-pomorskie",
  "lubelskie",
  "lubuskie",
  "lodzkie",
  "malopolskie",
  "mazowieckie",
  "opolskie",
  "podkarpackie",
  "podlaskie",
  "pomorskie",
  "slaskie",
  "swietokrzyskie",
  "warminsko-mazurskie",
  "wielkopolskie",
  "zachodniopomorskie",
] as const;

export type Voivodeship = (typeof VOIVODESHIPS)[number];

export interface UserAddress {
  voivodeship: Voivodeship | null;
  county: string | null;
  commune: string | null;
  postalCode: string | null;
}
