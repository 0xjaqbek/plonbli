"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { VOIVODESHIPS } from "@/domains/geo/types";
import { getPowiats, getGminas } from "@/domains/geo/teryt";

export interface LocationValue {
  voivodeship: string | null;
  county: string | null;
  commune: string | null;
}

interface LocationCascadeProps {
  mode: "filter" | "form";
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  labels?: {
    voivodeship?: string;
    county?: string;
    commune?: string;
    allVoivodeships?: string;
    allCounties?: string;
    allCommunes?: string;
  };
}

export function LocationCascade({
  mode,
  value,
  onChange,
  labels = {},
}: LocationCascadeProps) {
  const {
    voivodeship: labelVoiv = "Województwo",
    county: labelCounty = "Powiat",
    commune: labelCommune = "Gmina",
    allVoivodeships = "Wszystkie województwa",
    allCounties = "Wszystkie powiaty",
    allCommunes = "Wszystkie gminy",
  } = labels;

  const powiats = value.voivodeship ? getPowiats(value.voivodeship) : [];
  const gminas =
    value.voivodeship && value.county
      ? getGminas(value.voivodeship, value.county)
      : [];

  function handleVoivodeshipChange(v: string) {
    onChange({
      voivodeship: v === "all" ? null : v,
      county: null,
      commune: null,
    });
  }

  function handleCountyChange(v: string) {
    onChange({
      ...value,
      county: v === "all" ? null : v,
      commune: null,
    });
  }

  function handleCommuneChange(v: string) {
    onChange({
      ...value,
      commune: v === "all" ? null : v,
    });
  }

  const voivodeshipSelect = (
    <Select
      value={value.voivodeship ?? "all"}
      onValueChange={handleVoivodeshipChange}
    >
      <SelectTrigger>
        <SelectValue placeholder={labelVoiv} />
      </SelectTrigger>
      <SelectContent>
        {mode === "filter" && (
          <SelectItem value="all">{allVoivodeships}</SelectItem>
        )}
        {VOIVODESHIPS.map((v) => (
          <SelectItem key={v} value={v}>
            {v}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const countySelect = (
    <Select
      value={value.county ?? "all"}
      onValueChange={handleCountyChange}
      disabled={powiats.length === 0}
    >
      <SelectTrigger>
        <SelectValue placeholder={labelCounty} />
      </SelectTrigger>
      <SelectContent>
        {mode === "filter" && (
          <SelectItem value="all">{allCounties}</SelectItem>
        )}
        {powiats.map((p) => (
          <SelectItem key={p} value={p}>
            {p}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const communeSelect = (
    <Select
      value={value.commune ?? "all"}
      onValueChange={handleCommuneChange}
      disabled={gminas.length === 0}
    >
      <SelectTrigger>
        <SelectValue placeholder={labelCommune} />
      </SelectTrigger>
      <SelectContent>
        {mode === "filter" && (
          <SelectItem value="all">{allCommunes}</SelectItem>
        )}
        {gminas.map((g) => (
          <SelectItem key={g} value={g}>
            {g}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (mode === "filter") {
    return (
      <>
        {voivodeshipSelect}
        {countySelect}
        {communeSelect}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{labelVoiv}</Label>
        {voivodeshipSelect}
      </div>
      <div className="space-y-2">
        <Label>{labelCounty}</Label>
        {countySelect}
      </div>
      <div className="space-y-2">
        <Label>{labelCommune}</Label>
        {communeSelect}
      </div>
    </div>
  );
}
