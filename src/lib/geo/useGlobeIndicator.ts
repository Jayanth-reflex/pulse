"use client";

import { useMemo } from "react";
import { useCovidCountries } from "@/lib/swr/hooks";
import { useIndicator } from "@/lib/catalog/hooks";
import { percentileDomain } from "./metrics";
import type { CatalogEntry, YearPoint } from "@/lib/catalog/types";

export interface GlobeMarker {
  iso3: string;
  name: string;
  lat: number;
  long: number;
  value: number;
  /** COVID context (always available from disease.sh positions). */
  cases: number;
  deaths: number;
}

export interface GlobeIndicatorData {
  markers: GlobeMarker[];
  domain: [number, number];
  max: number;
  unit: string;
  name: string;
  globalSeries: YearPoint[];
  globalLatest: YearPoint | null;
  loading: boolean;
  error: Error | undefined;
}

/** Synthetic live entry: COVID cases per million (disease.sh, not snapshotted). */
export const LIVE_COVID_PER_M: CatalogEntry = {
  id: "__covid_per_million",
  name: "COVID-19 cases per million",
  category: "respiratory",
  unit: "per million",
  source: "diseasesh",
  latestYear: 2026,
  live: true,
};

/**
 * Projects ANY catalog indicator onto the globe by joining its per-country
 * values to disease.sh country positions (which carry lat/long).
 */
export function useGlobeIndicator(
  entry: CatalogEntry | null,
): GlobeIndicatorData {
  const covid = useCovidCountries();
  const isLive = entry?.source === "diseasesh";
  const ind = useIndicator(isLive ? null : entry);

  return useMemo(() => {
    const positions = covid.data ?? [];
    const empty: GlobeIndicatorData = {
      markers: [],
      domain: [0, 1],
      max: 1,
      unit: entry?.unit ?? "",
      name: entry?.name ?? "",
      globalSeries: [],
      globalLatest: null,
      loading: !covid.data || (!isLive && ind.loading),
      error: (covid.error as Error) || ind.error,
    };
    if (!entry || !positions.length) return empty;

    const valueByIso = new Map<string, number>();
    if (isLive) {
      for (const d of positions) valueByIso.set(d.country.iso3, d.casesPerMillion);
    } else {
      for (const p of ind.data?.points ?? []) valueByIso.set(p.iso3, p.value);
    }

    const markers: GlobeMarker[] = [];
    for (const d of positions) {
      const v = valueByIso.get(d.country.iso3);
      if (v == null || !Number.isFinite(v)) continue;
      markers.push({
        iso3: d.country.iso3,
        name: d.country.name,
        lat: d.country.lat,
        long: d.country.long,
        value: v,
        cases: d.cases,
        deaths: d.deaths,
      });
    }
    const values = markers.map((m) => m.value);

    return {
      markers,
      domain: percentileDomain(values),
      max: values.length ? Math.max(...values) : 1,
      unit: isLive ? "per million" : (ind.data?.unit ?? entry.unit),
      name: entry.name,
      globalSeries: isLive ? [] : (ind.data?.globalSeries ?? []),
      globalLatest: isLive ? null : (ind.data?.globalLatest ?? null),
      loading: empty.loading,
      error: empty.error,
    };
  }, [covid.data, covid.error, ind.data, ind.loading, ind.error, entry, isLive]);
}
