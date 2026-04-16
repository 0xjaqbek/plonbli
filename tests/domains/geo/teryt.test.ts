import { describe, it, expect } from "vitest";
import { getPowiats, getGminas } from "@/domains/geo/teryt";

describe("getPowiats", () => {
  it("returns powiats for a valid voivodeship", () => {
    const powiats = getPowiats("dolnoslaskie");
    expect(powiats.length).toBeGreaterThan(0);
    expect(powiats).toContain("wrocławski");
  });

  it("returns empty array for unknown voivodeship", () => {
    expect(getPowiats("nieznane")).toEqual([]);
  });

  it("returns sorted list", () => {
    const powiats = getPowiats("malopolskie");
    const sorted = [...powiats].sort((a, b) => a.localeCompare(b, "pl"));
    expect(powiats).toEqual(sorted);
  });

  it("covers all 16 voivodeships", () => {
    const voivodeships = [
      "dolnoslaskie", "kujawsko-pomorskie", "lubelskie", "lubuskie",
      "lodzkie", "malopolskie", "mazowieckie", "opolskie", "podkarpackie",
      "podlaskie", "pomorskie", "slaskie", "swietokrzyskie",
      "warminsko-mazurskie", "wielkopolskie", "zachodniopomorskie",
    ];
    for (const v of voivodeships) {
      expect(getPowiats(v).length).toBeGreaterThan(0);
    }
  });
});

describe("getGminas", () => {
  it("returns gminas for a valid voivodeship + powiat", () => {
    const gminas = getGminas("dolnoslaskie", "wrocławski");
    expect(gminas.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown powiat", () => {
    expect(getGminas("dolnoslaskie", "nieznany")).toEqual([]);
  });

  it("returns empty array for unknown voivodeship", () => {
    expect(getGminas("nieznane", "jakis")).toEqual([]);
  });
});
